"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { TileFace } from "@/components/tiles/TileFace";

export interface SetupConfig {
  fanMinimum: 0 | 3;
  seed: number;
}

const DECORATIVE_TILES = [
  { suit: "dragons" as const, rank: 1 },
  { suit: "characters" as const, rank: 8 },
  { suit: "bamboo" as const, rank: 6 },
  { suit: "dots" as const, rank: 5 },
  { suit: "winds" as const, rank: 1 },
];

const optionBase =
  "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all";
const optionActive = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]";
const optionInactive = "border-slate-200 text-slate-500 hover:border-slate-300";

export function SetupForm({ onStart }: { onStart: (config: SetupConfig) => void }) {
  const [fanMinimum, setFanMinimum] = useState<0 | 3>(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-white/10 bg-white p-8 shadow-2xl"
    >
      <div className="flex justify-center gap-1.5">
        {DECORATIVE_TILES.map((tile, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -16, rotate: -8 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
          >
            <TileFace tile={{ id: String(i), ...tile }} size="sm" animateIn={false} />
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Hong Kong Mahjong</h1>
        <p className="mt-1 text-sm text-slate-500">Solo play against 3 intermediate bots.</p>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Win minimum</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setFanMinimum(0)}
            className={`${optionBase} ${fanMinimum === 0 ? optionActive : optionInactive}`}
          >
            0-fan minimum
          </button>
          <button
            type="button"
            onClick={() => setFanMinimum(3)}
            className={`${optionBase} ${fanMinimum === 3 ? optionActive : optionInactive}`}
          >
            3-fan minimum
          </button>
        </div>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onStart({ fanMinimum, seed: Date.now() })}
        className="rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800"
      >
        Start Game
      </motion.button>
    </motion.div>
  );
}
