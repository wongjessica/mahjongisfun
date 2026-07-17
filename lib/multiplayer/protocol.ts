import { GameAction, toGameAction } from "../mahjong/actions";
import { getLegalActions, mahjongReducer } from "../mahjong/reducer";
import { GameState } from "../mahjong/state";
import { FanMinimum } from "../mahjong/scoring/ruleset";

/** How often each client stamps its presence, and how stale a stamp can get
 * before the player counts as disconnected. Takeover is deliberately much
 * longer than the disconnect threshold: a flaky connection shouldn't hand
 * your seat to a bot, only a genuinely absent player's. */
export const HEARTBEAT_INTERVAL_MS = 4_000;
export const DISCONNECT_AFTER_MS = 12_000;
export const BOT_TAKEOVER_AFTER_MS = 30_000;

export interface RoomConfig {
  fanMinimum: FanMinimum;
  speed: "fast" | "slow";
  anonymousDiscards: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  /** Chosen avatar emoji (optional for rooms created before icons existed). */
  icon?: string;
  /** Seat is assigned at join time (join order), so it's stable from the
   * lobby through the whole match. */
  seat: number;
  joinedAt: number;
  /** Last presence stamp (transport clock). Liveness is derived from this,
   * never stored, so a crashed tab can't leave a stale `connected: true`. */
  lastSeen: number;
}

export interface RoundInfo {
  /** Monotonic per-match round counter -- clients key their GameProvider on
   * this, so a new round remounts the board (dice roll included). */
  id: number;
  /** Full initial GameState, JSON-stringified. Stringified rather than
   * stored as a tree because RTDB silently drops empty arrays/nulls, which
   * would corrupt replay (an empty discards array MUST stay an array). */
  initialStateJson: string;
}

/** One appended game action. actionJson is the exact GameAction another
 * client dispatched; seat is who dispatched it (needed for legality checks,
 * since DRAW/DISCARD/REPLACE_FLOWER carry no seat of their own). */
export interface RemoteAction {
  roundId: number;
  seat: number;
  actionJson: string;
}

export type RoomStatus = "lobby" | "playing";

export interface RoomSnapshot {
  code: string;
  createdAt: number;
  status: RoomStatus;
  config: RoomConfig;
  players: Record<string, RoomPlayer>;
  /** Display names for bot-filled seats, chosen once by the host at start. */
  botNames: Record<number, string>;
  round: RoundInfo | null;
  actions: RemoteAction[];
}

export function playersInJoinOrder(room: RoomSnapshot): RoomPlayer[] {
  return Object.values(room.players).sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
}

export function isPlayerConnected(player: RoomPlayer, now: number): boolean {
  return now - player.lastSeen < DISCONNECT_AFTER_MS;
}

/** The single client responsible for driving bots and advancing rounds:
 * the earliest-joined player who is still connected. Every client computes
 * this from the same snapshot, so leadership migrates automatically when
 * the current host disconnects -- no explicit handoff message needed. If a
 * stale host and the new one briefly overlap, their duplicate bot actions
 * are deduplicated by the replay legality gate. */
export function actingHostId(room: RoomSnapshot, now: number): string | null {
  const connected = playersInJoinOrder(room).filter((p) => isPlayerConnected(p, now));
  return connected[0]?.id ?? null;
}

/** True if `action` is currently legal for `seat` -- the replay gate that
 * makes the shared log convergent: every client drops exactly the same
 * illegal/duplicate/raced actions, so folding the log always produces the
 * same state everywhere. */
export function isActionLegal(state: GameState, seat: number, action: GameAction): boolean {
  const wanted = JSON.stringify(action);
  return getLegalActions(state, seat).some((legal) => JSON.stringify(toGameAction(legal, seat)) === wanted);
}

/** Folds a round's action log over its initial state. Pure and deterministic:
 * same log in, same GameState out, on every client. */
export function replayRound(round: RoundInfo, actions: RemoteAction[]): GameState {
  let state = JSON.parse(round.initialStateJson) as GameState;
  for (const remote of actions) {
    if (remote.roundId !== round.id) continue;
    const action = JSON.parse(remote.actionJson) as GameAction;
    if (isActionLegal(state, remote.seat, action)) {
      state = mahjongReducer(state, action);
    }
  }
  return state;
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
