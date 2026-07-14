"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { TileFace, tileLabel } from "@/components/tiles/TileFace";

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };
const WIND_GLYPH: Record<number, string> = { 1: "東", 2: "南", 3: "西", 4: "北" };

export function CenterTable() {
  const { state, humanSeat, botNames, anonymousDiscards } = useGame();
  const { lastDiscard } = state;

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-950/40 bg-gradient-to-br from-emerald-800 to-emerald-900 px-4 py-3 shadow-inner">
      <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-950/30 px-3 py-1">
        <span className="text-lg font-bold leading-none text-amber-300">{WIND_GLYPH[state.roundWind]}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-amber-200">
          {WIND_NAMES[state.roundWind]} round
        </span>
      </div>

      <div className="flex items-center gap-4 text-emerald-50">
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold">{state.wall.liveTiles.length}</span>
          <span className="text-[10px] uppercase tracking-wide text-emerald-200/80">tiles left</span>
        </div>
        <div className="h-8 w-px bg-emerald-600/60" />
        <div className="flex flex-col items-center text-xs">
          <span className="font-semibold">{state.ruleset.fanMinimum}-fan minimum</span>
        </div>
      </div>

      <div className="flex h-20 items-center justify-center">
        <AnimatePresence mode="wait">
          {lastDiscard ? (
            <motion.div
              key={lastDiscard.tile.id}
              initial={{ opacity: 0, scale: 0.6, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[11px] font-medium text-emerald-100/90">
                {anonymousDiscards
                  ? "Someone"
                  : lastDiscard.seat === humanSeat
                    ? "You"
                    : botNames[lastDiscard.seat]}{" "}
                discarded
              </span>
              <TileFace tile={lastDiscard.tile} size="sm" animateIn={false} />
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
