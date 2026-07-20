"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameAction } from "@/lib/mahjong/actions";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState, Wind } from "@/lib/mahjong/state";
import {
  BOT_TAKEOVER_AFTER_MS,
  HEARTBEAT_INTERVAL_MS,
  RoomConfig,
  RoomSnapshot,
  actingHostId,
  generateRoomCode,
  isActionLegal,
  isPlayerConnected,
  normalizeRoomCode,
  playersInJoinOrder,
  replayRound,
} from "@/lib/multiplayer/protocol";
import { getTransport } from "@/lib/multiplayer/getTransport";
import { assignNamesForSeats } from "@/components/game/botNames";
import { getCurrentUid } from "@/lib/profile/session";

/** The signed-in uid as a spreadable field, or {} for guests. Firebase RTDB
 * REJECTS any write containing `undefined`, so a guest's absent uid must be
 * an omitted key, never `uid: undefined` -- otherwise room create/join
 * throws and guests can't play online at all. */
function uidField(): { uid?: string } {
  const uid = getCurrentUid();
  return uid ? { uid } : {};
}

const PLAYER_ID_KEY = "mahjong-player-id";
const PLAYER_NAME_KEY = "mahjong-player-name";

/** Identity is per-TAB (sessionStorage), not per-device: that's what makes
 * a two-tab game on one machine possible with the local transport, and it
 * costs nothing online -- rejoining after a closed tab just means entering
 * the room code again. */
export function getPlayerId(): string {
  let id = sessionStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    sessionStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  fanMinimum: 3,
  speed: "slow",
  anonymousDiscards: true,
};

export async function createOnlineRoom(playerName: string, icon: string): Promise<string> {
  const transport = await getTransport();
  const code = generateRoomCode();
  const playerId = getPlayerId();
  const now = transport.now();
  await transport.createRoom({
    code,
    createdAt: now,
    status: "lobby",
    config: DEFAULT_ROOM_CONFIG,
    players: {
      // Creator starts at East (seat 0) but can move in the lobby.
      [playerId]: { id: playerId, name: playerName, icon, ...uidField(), seat: 0, joinedAt: now, lastSeen: now },
    },
    botNames: {},
    round: null,
    actions: [],
  });
  return code;
}

export type JoinError = "not-found" | "full" | "in-progress";

export async function joinOnlineRoom(
  codeInput: string,
  playerName: string,
  icon: string
): Promise<{ code: string } | { error: JoinError }> {
  const transport = await getTransport();
  const code = normalizeRoomCode(codeInput);
  const room = await transport.fetchRoom(code);
  if (!room) return { error: "not-found" };
  const playerId = getPlayerId();
  const alreadyIn = Boolean(room.players[playerId]);
  if (!alreadyIn) {
    if (room.status !== "lobby") {
      // A running room always lets you in. If a seat the current round was
      // dealt to a HUMAN is now empty (someone left, it's being bot-covered),
      // take it and start playing immediately. Otherwise join as a SPECTATOR
      // (seat -1): watch the game, and take an open bot seat from the
      // spectator view to be dealt in next round.
      const taken = new Set(Object.values(room.players).map((p) => p.seat));
      const dealtHumans: number[] = room.round
        ? (JSON.parse(room.round.initialStateJson) as { players: { seat: number; isBot: boolean }[] })
            .players.filter((p) => !p.isBot)
            .map((p) => p.seat)
        : [];
      const orphanSeat = dealtHumans.find((seat) => !taken.has(seat));
      await transport.setPlayer(code, {
        id: playerId,
        name: playerName,
        icon,
        ...uidField(),
        seat: orphanSeat ?? -1,
        joinedAt: transport.now(),
        lastSeen: transport.now(),
      });
      return { code };
    }
    if (Object.keys(room.players).length >= 4) return { error: "full" };
    // Default to the lowest open seat; the lobby lets you move afterward.
    const taken = new Set(Object.values(room.players).map((p) => p.seat));
    const seat = [0, 1, 2, 3].find((s) => !taken.has(s)) ?? -1;
    await transport.setPlayer(code, {
      id: playerId,
      name: playerName,
      icon,
      ...uidField(),
      seat,
      joinedAt: transport.now(),
      lastSeen: transport.now(),
    });
  }
  return { code };
}

export interface OnlineRoomState {
  room: RoomSnapshot | null;
  /** Null while connecting; false once we know the room doesn't exist. */
  roomExists: boolean | null;
  mySeat: number;
  isActingHost: boolean;
  /** Seat -> name for every seat except mine (humans and bots alike). */
  seatNames: Record<number, string>;
  /** Seat -> chosen avatar emoji, for every human who picked one. */
  seatIcons: Record<number, string>;
  /** Replayed, authoritative game state (null until a round starts). */
  gameState: GameState | null;
  driveSeats: number[];
  dispatch: (action: GameAction) => void;
  startGame: (config: RoomConfig) => Promise<void>;
  claimSeat: (seat: number) => Promise<void>;
  nextRound: (
    dealerIndex: number,
    startingScores: [number, number, number, number],
    roundWind: Wind
  ) => Promise<void>;
  setConfig: (config: RoomConfig) => Promise<void>;
  leave: () => Promise<void>;
  now: number;
}

export function useOnlineRoom(code: string): OnlineRoomState {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  // Presence/host math needs a slowly-ticking "now" so a vanished player is
  // noticed even when no room writes are arriving.
  const [now, setNow] = useState(() => Date.now());
  const playerId = useMemo(() => getPlayerId(), []);
  const roomRef = useRef<RoomSnapshot | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    getTransport().then((transport) => {
      if (cancelled) return;
      unsubscribe = transport.subscribe(code, (snapshot) => {
        roomRef.current = snapshot;
        setRoom(snapshot);
        setRoomExists(snapshot !== null);
      });
      transport.touchPlayer(code, playerId);
      heartbeat = setInterval(() => transport.touchPlayer(code, playerId), HEARTBEAT_INTERVAL_MS);
      ticker = setInterval(() => setNow(transport.now()), 2000);
      setNow(transport.now());
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
      if (ticker) clearInterval(ticker);
    };
  }, [code, playerId]);

  const me = room?.players[playerId] ?? null;
  const mySeat = me?.seat ?? -1;
  const isActingHost = room !== null && actingHostId(room, now) === playerId;

  const gameState = useMemo(() => {
    if (!room?.round) return null;
    return replayRound(room.round, room.actions);
  }, [room?.round, room?.actions]);

  const seatNames = useMemo(() => {
    const names: Record<number, string> = { ...(room?.botNames ?? {}) };
    if (room) {
      for (const player of Object.values(room.players)) {
        if (player.seat >= 0 && player.id !== playerId) names[player.seat] = player.name;
      }
    }
    return names;
  }, [room, playerId]);

  // Unlike seatNames, this includes the local player's own seat -- your
  // avatar is yours everywhere, not just on other people's screens.
  const seatIcons = useMemo(() => {
    const icons: Record<number, string> = {};
    if (room) {
      for (const player of Object.values(room.players)) {
        if (player.seat >= 0 && player.icon) icons[player.seat] = player.icon;
      }
    }
    return icons;
  }, [room]);

  // The acting host's bot AI drives: every seat the CURRENT ROUND was dealt
  // as a bot (keyed off the round's own isBot, not off player records -- so a
  // spectator who claims a bot seat for NEXT round doesn't make the host stop
  // driving that bot this round), plus any human seat whose player has been
  // unreachable past the takeover grace period. Everyone else drives nothing.
  const driveSeats = useMemo(() => {
    if (!room || !gameState || !isActingHost) return [];
    const playerBySeat = new Map<number, (typeof room.players)[string]>();
    for (const player of Object.values(room.players)) {
      if (player.seat >= 0) playerBySeat.set(player.seat, player);
    }
    const seats: number[] = [];
    for (const gp of gameState.players) {
      if (gp.seat === mySeat) continue; // the host plays its own seat manually
      if (gp.isBot) {
        seats.push(gp.seat);
        continue;
      }
      const human = playerBySeat.get(gp.seat);
      if (!human || now - human.lastSeen > BOT_TAKEOVER_AFTER_MS) seats.push(gp.seat);
    }
    return seats;
  }, [room, gameState, isActingHost, mySeat, now]);

  const dispatch = useCallback(
    (action: GameAction) => {
      const current = roomRef.current;
      if (!current?.round) return;
      const state = replayRound(current.round, current.actions);
      // Find which seat this client is acting for: its own, or one of the
      // bot seats it drives. Validate before appending so an obviously
      // stale/illegal action never even hits the log.
      const seatOfAction = "seat" in action ? action.seat : state.turn.activeSeat;
      if (!isActionLegal(state, seatOfAction, action)) return;
      getTransport().then((transport) =>
        transport.appendAction(current.code, {
          roundId: current.round!.id,
          seat: seatOfAction,
          actionJson: JSON.stringify(action),
        })
      );
    },
    []
  );

  const startGame = useCallback(
    async (config: RoomConfig) => {
      const transport = await getTransport();
      const current = roomRef.current;
      if (!current) return;
      // Seats were chosen in the lobby. Resolve any same-instant claim
      // collisions deterministically (earliest-joined keeps the seat) and
      // drop anyone unseated into the lowest open seat. Every seat left
      // over becomes a bot. East (seat 0) deals first whether it's a human
      // or a bot.
      const ordered = playersInJoinOrder(current).filter((p) => isPlayerConnected(p, transport.now()));
      const takenSeats = new Set<number>();
      const resolved: { player: (typeof ordered)[number]; seat: number }[] = [];
      for (const player of ordered.slice(0, 4)) {
        let seat = player.seat;
        if (seat < 0 || seat > 3 || takenSeats.has(seat)) {
          seat = [0, 1, 2, 3].find((s) => !takenSeats.has(s))!;
        }
        takenSeats.add(seat);
        resolved.push({ player, seat });
      }
      const humanSeats = resolved.map((r) => r.seat);
      for (const { player, seat } of resolved) {
        if (player.seat !== seat) await transport.setPlayer(current.code, { ...player, seat });
      }
      const botSeats = [0, 1, 2, 3].filter((seat) => !humanSeats.includes(seat));
      await transport.setBotNames(current.code, assignNamesForSeats(botSeats));
      await transport.setConfig(current.code, config);
      const initial = createInitialState({
        fanMinimum: config.fanMinimum,
        seed: Date.now(),
        humanSeats,
        dealerIndex: 0,
      });
      await transport.setRound(current.code, { id: 1, initialStateJson: JSON.stringify(initial) });
      await transport.setStatus(current.code, "playing");
    },
    []
  );

  const nextRound = useCallback(
    async (
      dealerIndex: number,
      startingScores: [number, number, number, number],
      roundWind: Wind
    ) => {
      const transport = await getTransport();
      const current = roomRef.current;
      if (!current?.round) return;
      const humanSeats = Object.values(current.players)
        .map((p) => p.seat)
        .filter((seat) => seat >= 0);
      const initial = createInitialState({
        fanMinimum: current.config.fanMinimum,
        seed: Date.now(),
        humanSeats,
        dealerIndex,
        roundWind,
        startingScores,
      });
      await transport.setRound(current.code, {
        id: current.round.id + 1,
        initialStateJson: JSON.stringify(initial),
      });
    },
    []
  );

  const setConfig = useCallback(async (config: RoomConfig) => {
    const transport = await getTransport();
    if (roomRef.current) await transport.setConfig(roomRef.current.code, config);
  }, []);

  /** Take a seat that no other player holds -- in the lobby (rearranging
   * before start) or mid-game (a spectator claiming an open bot seat). If
   * the current round dealt that seat as a human whose player left, the
   * claimant plays immediately; if it's still a bot this round, they're
   * dealt in on the next round. Same-instant races resolve deterministically
   * at startGame/nextRound (earliest-joined keeps it). */
  const claimSeat = useCallback(
    async (seat: number) => {
      const current = roomRef.current;
      if (!current || seat < 0 || seat > 3) return;
      const me = current.players[playerId];
      if (!me || me.seat === seat) return;
      const occupied = Object.values(current.players).some((p) => p.id !== playerId && p.seat === seat);
      if (occupied) return;
      const transport = await getTransport();
      await transport.setPlayer(current.code, { ...me, seat });
    },
    [playerId]
  );

  const leave = useCallback(async () => {
    const transport = await getTransport();
    await transport.removePlayer(code, playerId);
  }, [code, playerId]);

  return {
    room,
    roomExists,
    mySeat,
    isActingHost,
    seatNames,
    seatIcons,
    gameState,
    driveSeats,
    dispatch,
    startGame,
    claimSeat,
    nextRound,
    setConfig,
    leave,
    now,
  };
}
