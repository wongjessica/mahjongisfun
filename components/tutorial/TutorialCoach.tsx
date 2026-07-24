"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useGame } from "@/components/game/GameContext";
import { coachHint, CoachTone } from "@/lib/tutorial/coachHints";

const TONE_STYLES: Record<CoachTone, string> = {
  action: "border-amber-300 bg-amber-50 text-amber-950",
  celebrate: "border-emerald-400 bg-emerald-50 text-emerald-950",
  info: "border-emerald-200 bg-white text-gray-800",
};

/** The live coach that rides along the practice game. It reads the shared
 * game state (same as the board) and shows one contextual instruction plus a
 * first-game checklist. Collapsible so it never gets in the way. */
export function TutorialCoach() {
  const { state, humanSeat, botNames } = useGame();
  const [collapsed, setCollapsed] = useState(false);

  const nameForSeat = (seat: number) => (seat === humanSeat ? "You" : botNames[seat] ?? "A player");
  const hint = coachHint(state, humanSeat, nameForSeat);

  const me = state.players[humanSeat];
  const milestones = [
    { label: "Discard a tile", done: me.discards.length > 0 },
    { label: "Claim a tile (optional)", done: me.melds.length > 0 },
    { label: "Finish the round", done: state.turn.phase === "round-ended" },
  ];

  if (collapsed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setCollapsed(false)}
        className="fixed right-2 top-2 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300 bg-white text-xl shadow-lg"
        aria-label="Show coach"
      >
        🎓
        {hint?.tone !== "info" && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-amber-400" />
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed left-1/2 top-2 z-40 w-[calc(100%-1rem)] max-w-md -translate-x-1/2"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg">
            🎓
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Coach</span>
              <button
                onClick={() => setCollapsed(true)}
                className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
              >
                Hide
              </button>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={hint?.id ?? "idle"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className={`mt-1 rounded-xl border px-3 py-2 text-[13px] leading-snug ${
                  TONE_STYLES[hint?.tone ?? "info"]
                }`}
              >
                {hint?.text ?? "Take your time — I'll pop in whenever it's your move."}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 pl-10 text-[11px]">
          {milestones.map((m) => (
            <span
              key={m.label}
              className={`flex items-center gap-1 ${m.done ? "text-emerald-700" : "text-gray-400"}`}
            >
              <span>{m.done ? "✓" : "○"}</span>
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
