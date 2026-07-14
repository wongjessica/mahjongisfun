"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { TileFace } from "@/components/tiles/TileFace";

export type GameSpeed = "fast" | "slow";

export interface SetupConfig {
  fanMinimum: 0 | 3;
  seed: number;
  anonymousDiscards: boolean;
  speed: GameSpeed;
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

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border-2 border-slate-200 px-4 py-3 text-left transition-all hover:border-slate-300"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        <span className="block text-xs text-slate-400">{hint}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <motion.span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}

export function SetupForm({ onStart }: { onStart: (config: SetupConfig) => void }) {
  const [fanMinimum, setFanMinimum] = useState<0 | 3>(3);
  const [anonymousDiscards, setAnonymousDiscards] = useState(false);
  const [speed, setSpeed] = useState<GameSpeed>("slow");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8"
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

      <div>
        <span className="block text-sm font-medium text-slate-700">Game speed</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setSpeed("fast")}
            className={`${optionBase} ${speed === "fast" ? optionActive : optionInactive}`}
          >
            ⚡ Fast
          </button>
          <button
            type="button"
            onClick={() => setSpeed("slow")}
            className={`${optionBase} ${speed === "slow" ? optionActive : optionInactive}`}
          >
            🎬 Immersive
          </button>
        </div>
      </div>

      <ToggleRow
        label="Show who discarded"
        hint="Off: all discards mix into one anonymous pile"
        checked={!anonymousDiscards}
        onChange={(checked) => setAnonymousDiscards(!checked)}
      />

      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onStart({ fanMinimum, seed: Date.now(), anonymousDiscards, speed })}
        className="rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800"
      >
        Start Game
      </motion.button>
    </motion.div>
  );
}
