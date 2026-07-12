"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { TileFace, tileLabel } from "@/components/tiles/TileFace";

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };

export function CenterTable() {
  const { state, humanSeat } = useGame();
  const { lastDiscard } = state;

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-950/40 bg-gradient-to-br from-emerald-800 to-emerald-900 px-4 py-5 shadow-inner">
      <div className="flex items-center gap-4 text-emerald-50">
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold">{state.wall.liveTiles.length}</span>
          <span className="text-[10px] uppercase tracking-wide text-emerald-200/80">tiles left</span>
        </div>
        <div className="h-8 w-px bg-emerald-600/60" />
        <div className="flex flex-col items-center text-xs">
          <span className="font-semibold">{WIND_NAMES[state.roundWind]} round</span>
          <span className="text-emerald-200/80">{state.ruleset.fanMinimum}-fan minimum</span>
        </div>
      </div>

      <div className="flex h-24 items-center justify-center">
        <AnimatePresence mode="wait">
          {lastDiscard ? (
            <motion.div
              key={lastDiscard.tile.id}
              initial={{ opacity: 0, scale: 0.6, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-[11px] font-medium text-emerald-100/90">
                {lastDiscard.seat === humanSeat ? "You" : `${WIND_NAMES[state.players[lastDiscard.seat].seatWind]} bot`}{" "}
                discarded
              </span>
              <TileFace tile={lastDiscard.tile} size="lg" animateIn={false} />
              <span className="text-[11px] font-semibold text-amber-300">
                {tileLabel(lastDiscard.tile)}
              </span>
            </motion.div>
          ) : (
            <motion.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-emerald-200/60"
            >
              Waiting for the first discard…
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
