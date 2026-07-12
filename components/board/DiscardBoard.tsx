"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { LabeledTile } from "@/components/tiles/LabeledTile";
import { nextSeat } from "@/lib/mahjong/state";

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };
const WIND_DOT: Record<number, string> = {
  1: "bg-amber-500",
  2: "bg-rose-500",
  3: "bg-sky-500",
  4: "bg-violet-500",
};

function SeatRow({ seat, isHuman }: { seat: number; isHuman: boolean }) {
  const { state } = useGame();
  const player = state.players[seat];
  const lastDiscardId =
    state.lastDiscard && state.lastDiscard.seat === seat ? state.lastDiscard.tile.id : null;

  return (
    <div className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
      <div className="flex w-20 shrink-0 items-center gap-1.5 pt-1">
        <span className={`h-2 w-2 shrink-0 rounded-full ${WIND_DOT[player.seatWind]}`} />
        <span className="truncate text-xs font-semibold text-slate-600">
          {isHuman ? "You" : WIND_NAMES[player.seatWind]}
        </span>
      </div>
      <div className="min-h-[3.2rem] flex-1 flex-wrap gap-1.5 border-l border-slate-200 pl-2.5 flex">
        {player.discards.length > 0 ? (
          <AnimatePresence>
            {player.discards.map((tile) => (
              <LabeledTile
                key={tile.id}
                tile={tile}
                size="sm"
                layoutId={tile.id}
                highlight={tile.id === lastDiscardId}
              />
            ))}
          </AnimatePresence>
        ) : (
          <span className="pt-2 text-xs text-slate-300">—</span>
        )}
      </div>
    </div>
  );
}

/** The full discard history for all four seats, always visible -- this is
 * the central "count the tiles" reference the rest of the UI supplements
 * with quick callouts, not a substitute for. */
export function DiscardBoard() {
  const { humanSeat } = useGame();
  const rightSeat = nextSeat(humanSeat);
  const topSeat = nextSeat(rightSeat);
  const leftSeat = nextSeat(topSeat);

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/10 bg-white/90 p-3 shadow-lg backdrop-blur-sm"
    >
      <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Discards</h2>
      <div className="divide-y divide-slate-100">
        <SeatRow seat={humanSeat} isHuman />
        <SeatRow seat={rightSeat} isHuman={false} />
        <SeatRow seat={topSeat} isHuman={false} />
        <SeatRow seat={leftSeat} isHuman={false} />
      </div>
    </motion.div>
  );
}
