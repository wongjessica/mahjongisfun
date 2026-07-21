"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GameBoard } from "@/components/board/GameBoard";
import { GameContextProvider } from "@/components/game/GameContext";
import { IconPicker, getSavedIcon, saveIcon } from "@/components/setup/IconPicker";
import { useProfile } from "@/components/profile/ProfileContext";
import { getCurrentUid } from "@/lib/profile/session";
import { normalizeRoomCode } from "@/lib/multiplayer/protocol";
import { Lobby } from "./Lobby";
import { SpectatorView } from "./SpectatorView";
import {
  JoinError,
  createOnlineRoom,
  getSavedPlayerName,
  joinOnlineRoom,
  savePlayerName,
  useOnlineRoom,
} from "./useOnlineRoom";

function hashCode(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(h, 31) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

const JOIN_ERROR_TEXT: Record<JoinError, string> = {
  "not-found": "No room with that code. Double-check it (codes never contain 0, O, 1, I, or L).",
  full: "That room already has 4 players.",
  "in-progress": "That game is in progress and every seat has a player. (If someone leaves mid-game, joining with this code takes over their seat.)",
};

/** Entry screen for online play: pick a name, then create a room or join
 * one by code (a ?room= link prefills the code). */
function OnlineHome({
  initialCode,
  onEnterRoom,
  onBack,
}: {
  initialCode: string;
  onEnterRoom: (code: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [icon, setIcon] = useState("🙂");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(getSavedPlayerName());
    setIcon(getSavedIcon());
  }, []);

  const trimmedName = name.trim();

  const create = async () => {
    if (!trimmedName || busy) return;
    setBusy(true);
    setError(null);
    try {
      savePlayerName(trimmedName);
      saveIcon(icon);
      onEnterRoom(await createOnlineRoom(trimmedName, icon));
    } catch {
      setError("Couldn't create the room. Check your connection and try again.");
      setBusy(false);
    }
  };

  const join = async () => {
    if (!trimmedName || !code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      savePlayerName(trimmedName);
      saveIcon(icon);
      const result = await joinOnlineRoom(code, trimmedName, icon);
      if ("error" in result) {
        setError(JOIN_ERROR_TEXT[result.error]);
        setBusy(false);
      } else {
        onEnterRoom(result.code);
      }
    } catch {
      setError("Couldn't join the room. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Play with Friends</h1>
        <p className="mt-1 text-sm text-slate-500">
          2–4 players share a table; empty seats are filled by bots.
        </p>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-slate-700">Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={14}
          placeholder="e.g. Jess"
          className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-300 focus:border-emerald-400"
        />
      </label>

      <IconPicker value={icon} onChange={setIcon} />

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={!trimmedName || busy}
        onClick={create}
        className="rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        Create a Room
      </motion.button>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-300">
        <span className="h-px flex-1 bg-slate-200" />
        or join one
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
          maxLength={6}
          placeholder="ROOM CODE"
          className="w-0 flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.25em] text-slate-800 outline-none transition-colors placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 focus:border-emerald-400"
        />
        <button
          type="button"
          disabled={!trimmedName || !code.trim() || busy}
          onClick={join}
          className="rounded-xl border-2 border-emerald-600 px-5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
        >
          Join
        </button>
      </div>

      {error && <p className="text-center text-xs font-medium text-rose-500">{error}</p>}

      <button onClick={onBack} className="text-xs font-medium text-slate-400 underline hover:text-slate-600">
        ← Back to solo play
      </button>
    </motion.div>
  );
}

/** Inside a room: lobby until the host starts, then the live game board
 * running off the shared action log. */
function RoomScreen({ code, onExit }: { code: string; onExit: () => void }) {
  const online = useOnlineRoom(code);
  const { room, roomExists, mySeat, gameState, dispatch, driveSeats, seatNames, seatIcons, isActingHost } = online;

  const leaveAndExit = async () => {
    await online.leave();
    onExit();
  };

  const diceSeed = useMemo(
    () => (room?.round ? hashCode(code) ^ room.round.id : 0),
    [code, room?.round]
  );

  // Once a game is underway, record every other signed-in player at the
  // table as a friend, so they show up on each other's leaderboards.
  const { recordFriends } = useProfile();
  useEffect(() => {
    if (!room || room.status !== "playing") return;
    const friends: Record<string, string> = {};
    for (const p of Object.values(room.players)) {
      if (p.uid && p.uid !== getCurrentUid()) friends[p.uid] = p.name;
    }
    if (Object.keys(friends).length > 0) recordFriends(friends);
  }, [room, recordFriends]);

  if (roomExists === false) {
    return (
      <Centered>
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white p-8 text-center shadow-2xl">
          <p className="text-sm font-semibold text-slate-700">This room no longer exists.</p>
          <button onClick={onExit} className="text-xs font-medium text-emerald-700 underline">
            ← Back
          </button>
        </div>
      </Centered>
    );
  }

  if (!room) {
    return (
      <Centered>
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-emerald-200"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          Connecting…
        </p>
      </Centered>
    );
  }

  if (room.status === "lobby") {
    return (
      <Centered>
        <Lobby online={online} onLeave={leaveAndExit} />
      </Centered>
    );
  }

  if (!gameState || !room.round) {
    return (
      <Centered>
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white p-8 text-center shadow-2xl">
          <p className="text-sm font-semibold text-slate-700">Loading the table…</p>
          <button onClick={leaveAndExit} className="text-xs font-medium text-emerald-700 underline">
            ← Back
          </button>
        </div>
      </Centered>
    );
  }

  // Am I actually playing THIS round? Only if I hold a seat the current deal
  // marked as human. A spectator (no seat) or someone who claimed a still-bot
  // seat for next round watches instead.
  const iAmPlaying = mySeat >= 0 && !gameState.players[mySeat]?.isBot;

  if (!iAmPlaying) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)]">
        <GameContextProvider
          value={{
            state: gameState,
            dispatch,
            humanSeat: -1,
            anonymousDiscards: room.config.anonymousDiscards,
            speed: room.config.speed,
            botNames: seatNames,
            icons: seatIcons,
            driveSeats: [],
            canAdvanceRound: false,
            isOnline: true,
            isSpectator: true,
            roomCode: code,
          }}
        >
          <SpectatorView online={online} code={code} onLeave={leaveAndExit} />
        </GameContextProvider>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)]">
      <GameContextProvider
        key={room.round.id}
        value={{
          state: gameState,
          dispatch,
          humanSeat: mySeat,
          anonymousDiscards: room.config.anonymousDiscards,
          speed: room.config.speed,
          botNames: seatNames,
          icons: seatIcons,
          driveSeats,
          canAdvanceRound: isActingHost,
          isOnline: true,
          roomCode: code,
        }}
      >
        <GameBoard
          onNextRound={(dealerIndex, scores, roundWind) =>
            void online.nextRound(dealerIndex, scores, roundWind)
          }
          onNewMatch={() => void leaveAndExit()}
          diceSeed={diceSeed}
        />
      </GameContextProvider>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)] p-4">
      {children}
    </main>
  );
}

export function OnlineFlow({ initialRoomCode, onBack }: { initialRoomCode?: string; onBack: () => void }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);

  if (roomCode) {
    return <RoomScreen code={roomCode} onExit={() => setRoomCode(null)} />;
  }

  return (
    <Centered>
      <OnlineHome
        initialCode={normalizeRoomCode(initialRoomCode ?? "")}
        onEnterRoom={setRoomCode}
        onBack={onBack}
      />
    </Centered>
  );
}
