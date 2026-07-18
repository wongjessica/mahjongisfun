"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TileFace } from "@/components/tiles/TileFace";
import { IconPicker, getSavedIcon, saveIcon } from "@/components/setup/IconPicker";
import { RulesModal } from "@/components/setup/RulesModal";
import { SoundToggle } from "@/components/SoundToggle";
import { AccountPanel } from "@/components/profile/AccountPanel";
import { useProfile } from "@/components/profile/ProfileContext";
import { FanMinimum } from "@/lib/mahjong/scoring/ruleset";

export type GameSpeed = "fast" | "slow";

export interface SetupConfig {
  fanMinimum: FanMinimum;
  seed: number;
  anonymousDiscards: boolean;
  speed: GameSpeed;
  icon: string;
}

const DECORATIVE_TILES = [
  { suit: "dragons" as const, rank: 1 },
  { suit: "characters" as const, rank: 8 },
  { suit: "bamboo" as const, rank: 6 },
  { suit: "dots" as const, rank: 5 },
  { suit: "winds" as const, rank: 1 },
];

export const optionBase =
  "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all";
export const optionActive = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]";
export const optionInactive = "border-slate-200 text-slate-500 hover:border-slate-300";

export function ToggleRow({
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

export function SetupForm({
  onStart,
  onPlayOnline,
}: {
  onStart: (config: SetupConfig) => void;
  onPlayOnline?: () => void;
}) {
  const [fanMinimum, setFanMinimum] = useState<FanMinimum>(3);
  const [anonymousDiscards, setAnonymousDiscards] = useState(false);
  const [speed, setSpeed] = useState<GameSpeed>("slow");
  const [icon, setIcon] = useState("🙂");
  const { profile } = useProfile();
  const wallet = profile.wallet;
  // localStorage isn't available during prerender -- load the icon on mount.
  useEffect(() => {
    setIcon(getSavedIcon());
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="relative mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8"
    >
      <RulesModal />
      <SoundToggle className="absolute left-3 top-3 border-2 border-slate-200 text-slate-500 hover:border-slate-300" />
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
        <div className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            🤖 Solo ${wallet.solo.toLocaleString()}
          </span>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">
            👥 Online ${wallet.online.toLocaleString()}
          </span>
        </div>
      </div>

      <AccountPanel />

      <IconPicker
        value={icon}
        onChange={(next) => {
          setIcon(next);
          saveIcon(next);
        }}
      />

      <div>
        <span className="block text-sm font-medium text-slate-700">Win minimum</span>
        <div className="mt-2 flex gap-2">
          {([0, 3, 5] as const).map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => setFanMinimum(min)}
              className={`${optionBase} ${fanMinimum === min ? optionActive : optionInactive}`}
            >
              {min}-fan{min === 5 ? " 🔥" : ""}
            </button>
          ))}
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
        onClick={() => onStart({ fanMinimum, seed: Date.now(), anonymousDiscards, speed, icon })}
        className="rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800"
      >
        Start Game
      </motion.button>

      {onPlayOnline && (
        <button
          type="button"
          onClick={onPlayOnline}
          className="rounded-xl border-2 border-emerald-600 px-4 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          👥 Play with Friends
        </button>
      )}
    </motion.div>
  );
}
