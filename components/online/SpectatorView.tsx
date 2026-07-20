"use client";

import { useGame } from "@/components/game/GameContext";
import { CenterTable } from "@/components/board/CenterTable";
import { DiscardBoard } from "@/components/board/DiscardBoard";
import { PlayerPanel } from "@/components/board/PlayerPanel";
import { OnlineRoomState } from "./useOnlineRoom";

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };

/** What a player who joined a running game sees: the live board, read-only,
 * with a panel to take an open seat (they're dealt in on the next round).
 * Rendered inside a GameContextProvider whose humanSeat is -1, so no hand is
 * "theirs" and nothing is interactive. */
export function SpectatorView({
  online,
  code,
  onLeave,
}: {
  online: OnlineRoomState;
  code: string;
  onLeave: () => void;
}) {
  const { state, botNames } = useGame();
  const { room, mySeat, claimSeat } = online;

  const roundEnded = state.turn.phase === "round-ended";
  const heldSeats = new Set(Object.values(room?.players ?? {}).map((p) => p.seat));
  const freeSeats = [0, 1, 2, 3].filter((s) => !heldSeats.has(s));
  const iClaimedSeat = mySeat >= 0;

  const winnerLine = roundEnded
    ? state.isDraw
      ? "Wall exhausted — no winner this round."
      : state.winners
          ?.map((w) => `${botNames[w.seat] ?? "Player"} won with ${w.fan} fan`)
          .join(" · ")
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5 p-2 sm:p-2.5">
      <div className="flex items-center justify-between rounded-xl border border-amber-300/40 bg-amber-950/30 px-3 py-1.5">
        <span className="flex items-center gap-2 text-sm font-bold text-amber-200">
          👀 Spectating · room {code}
        </span>
        <button onClick={onLeave} className="text-xs font-medium text-amber-200/70 underline hover:text-amber-100">
          Leave
        </button>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {[0, 1, 2, 3].map((seat) => (
          <PlayerPanel key={seat} seat={seat} isHuman={false} />
        ))}
      </div>

      <DiscardBoard />
      <CenterTable />

      <div className="rounded-xl border border-white/10 bg-white/90 p-3 text-center shadow-lg">
        {winnerLine && <p className="mb-2 text-sm font-bold text-amber-800">🏆 {winnerLine}</p>}

        {iClaimedSeat ? (
          <p className="text-sm font-semibold text-emerald-700">
            You&apos;re in as {WIND_NAMES[state.players[mySeat]?.seatWind ?? 1]} — you&apos;ll be dealt in
            when the next round starts.
          </p>
        ) : freeSeats.length > 0 ? (
          <>
            <p className="mb-2 text-sm font-medium text-slate-600">
              Take an open seat — you&apos;ll join on the next round:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {freeSeats.map((seat) => (
                <button
                  key={seat}
                  onClick={() => void claimSeat(seat)}
                  className="rounded-xl border-2 border-emerald-500 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  Sit as {WIND_NAMES[state.players[seat]?.seatWind ?? 1]} (currently {botNames[seat] ?? "a bot"})
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm font-medium text-slate-500">
            All four seats are taken — enjoy the show! You&apos;ll be able to sit in if a seat opens up.
          </p>
        )}
      </div>
    </div>
  );
}
