"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/components/game/GameContext";
import { playSound } from "@/lib/sound";

const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function randomFaceIndex(): number {
  return Math.floor(Math.random() * 6);
}

function Die({ rollingMs, finalIndex }: { rollingMs: number; finalIndex: number }) {
  const [faceIndex, setFaceIndex] = useState(randomFaceIndex);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start >= rollingMs) {
        setFaceIndex(finalIndex);
        clearInterval(interval);
        return;
      }
      setFaceIndex(randomFaceIndex());
    }, 80);
    return () => clearInterval(interval);
  }, [rollingMs, finalIndex]);

  return (
    <motion.span
      animate={{ rotate: [0, -14, 12, -8, 6, 0] }}
      transition={{ duration: rollingMs / 1000, ease: "easeOut" }}
      className="text-5xl leading-none text-white drop-shadow-lg"
    >
      {DIE_FACES[faceIndex]}
    </motion.span>
  );
}

/** The traditional 3-dice roll shown at the start of every round, before the
 * board is interactive -- purely a ritual/flavor reveal (the wall is already
 * fairly shuffled by the engine's RNG regardless of the roll), but the game
 * itself is genuinely paused underneath via the caller's bot/auto-draw
 * `paused` flags so nothing plays out invisibly behind it. */
export function DiceRoll({ onDone, seed }: { onDone: () => void; seed?: number }) {
  const { speed } = useGame();
  const rollingMs = speed === "fast" ? 450 : 1100;
  const holdMs = speed === "fast" ? 250 : 700;
  // Online play passes a shared per-round seed so every player at the table
  // watches the same three dice land -- they're one table, one roll. Solo
  // (no seed) keeps genuinely random dice.
  const [finalValues] = useState(() => {
    if (seed === undefined) return [randomFaceIndex(), randomFaceIndex(), randomFaceIndex()];
    let h = seed >>> 0;
    return [0, 1, 2].map(() => {
      h = (Math.imul(h ^ (h >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
      return h % 6;
    });
  });
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    playSound("dice");
    // The total must only appear once every die has actually stopped
    // spinning -- showing it earlier gives away the result before the
    // "roll" visually finishes, which doesn't read as a real dice roll.
    const settleTimeout = setTimeout(() => setSettled(true), rollingMs);
    const doneTimeout = setTimeout(onDone, rollingMs + holdMs);
    return () => {
      clearTimeout(settleTimeout);
      clearTimeout(doneTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-emerald-950/85 backdrop-blur-sm"
    >
      <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">
        Rolling the dice…
      </span>
      <div className="flex gap-4 rounded-2xl bg-emerald-900/60 px-8 py-6 shadow-xl">
        {finalValues.map((v, i) => (
          <Die key={i} rollingMs={rollingMs} finalIndex={v} />
        ))}
      </div>
      <div className="h-7">
        <AnimatePresence>
          {settled && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="block text-lg font-bold text-amber-300"
            >
              {finalValues.reduce((sum, v) => sum + v + 1, 0)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
