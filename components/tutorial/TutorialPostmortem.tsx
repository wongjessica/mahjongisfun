"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { TileFace, tileLabel } from "@/components/tiles/TileFace";
import { useGame } from "@/components/game/GameContext";
import { analyzePostmortem, WaitInfo } from "@/lib/tutorial/postmortem";
import { DOLLARS_PER_FAN } from "@/lib/wallet";

const MAX_SHOWN = 5;

/** Encouraging, accurate status for a wait tile. We never tell a beginner a
 * tile was "impossible" -- a copy in someone's hand just means it couldn't be
 * self-drawn; a win off their discard was still on the table. */
function waitStatus(wait: WaitInfo): { live: boolean; text: string } {
  if (wait.copiesInWall > 0) {
    const n = wait.copiesInWall;
    return { live: true, text: `✅ ${n} still in the wall — you could have drawn it, or claimed it if someone discarded it.` };
  }
  const held = wait.copiesHeldByOthers;
  const discarded = wait.copiesDiscarded;
  const were = (n: number) => (n === 1 ? "was" : "were");
  if (held > 0 && discarded === 0) {
    return {
      live: false,
      text: `🀄 The last ${held} ${were(held)} in other players' hands — you couldn't have drawn one yourself, but you'd have won the moment one of them discarded it.`,
    };
  }
  if (discarded > 0 && held === 0) {
    return {
      live: false,
      text: `⏳ All ${discarded} had already been discarded — a tile can only be claimed the instant it's thrown, so being ready a little sooner would've caught it.`,
    };
  }
  return {
    live: false,
    text: `🀄 None were left in the wall to draw — ${discarded} had been discarded and ${held} sat in other hands — but a win was still on if one of those got discarded.`,
  };
}

function WaitCard({ wait }: { wait: WaitInfo }) {
  const status = waitStatus(wait);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-2.5">
      <TileFace tile={wait.tile} size="sm" animateIn={false} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-emerald-950">{tileLabel(wait.tile)}</span>
          <span className="text-xs font-semibold text-amber-700">
            {wait.fan} fan{wait.fan === 0 ? " (plain hand)" : ""}
          </span>
        </div>
        {wait.patterns.length > 0 && (
          <p className="truncate text-[11px] text-gray-500">{wait.patterns.join(" · ")}</p>
        )}
        <p className={`text-[11px] font-medium ${status.live ? "text-emerald-700" : "text-amber-700"}`}>
          {status.text}
        </p>
      </div>
    </div>
  );
}

/** Shown once, at the end of a practice round the human did NOT win. It
 * explains what they were waiting on, whether it was even gettable, and what
 * the hand would have scored -- turning a loss/draw into a scoring lesson. */
export function TutorialPostmortem() {
  const { state, humanSeat } = useGame();
  const [dismissed, setDismissed] = useState(false);

  const ended = state.turn.phase === "round-ended";
  const humanWon = state.winners?.some((w) => w.seat === humanSeat) ?? false;

  const analysis = useMemo(
    () => (ended && !humanWon ? analyzePostmortem(state, humanSeat) : null),
    [ended, humanWon, state, humanSeat]
  );

  if (!ended || humanWon || dismissed || !analysis) return null;

  const shown = analysis.waits.slice(0, MAX_SHOWN);
  const extra = analysis.waits.length - shown.length;
  const bestFan = analysis.bestFan;
  const moneyLow = bestFan * DOLLARS_PER_FAN;
  const moneyHigh = bestFan * 3 * DOLLARS_PER_FAN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-50 to-white shadow-2xl"
      >
        <div className="flex flex-col gap-1 px-5 pt-5">
          <span className="text-2xl">{analysis.tenpai ? "🎯" : "💪"}</span>
          <h2 className="text-xl font-bold text-emerald-950">
            {analysis.tenpai ? "So close — here's what you needed" : "Good effort!"}
          </h2>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          {analysis.tenpai ? (
            <>
              <p className="text-[13px] leading-relaxed text-gray-700">
                Your hand was <strong>one tile away</strong> from winning. You could have won on any
                of these:
              </p>
              <div className="flex flex-col gap-2">
                {shown.map((w) => (
                  <WaitCard key={`${w.tile.suit}-${w.tile.rank}`} wait={w} />
                ))}
                {extra > 0 && (
                  <p className="text-center text-[11px] text-gray-400">+ {extra} more winning tile{extra > 1 ? "s" : ""}</p>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {bestFan > 0 ? (
                  <>
                    💰 At best this hand was worth <strong>{bestFan} fan</strong> — about{" "}
                    <strong>${moneyLow}</strong> off a discard, or <strong>${moneyHigh}</strong> on a
                    self-draw. More fan = more money, so patterns pay off!
                  </>
                ) : (
                  <>
                    💡 This hand had <strong>no scoring pattern — 0 fan</strong>, so even winning it
                    would barely pay. That&apos;s exactly why you aim for patterns like a flush or a
                    dragon triplet.
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-gray-700">
              Your hand still needed more than one tile to be ready — you hadn&apos;t reached the “one
              away” point yet. Keep trading tiles toward <strong>4 sets + 1 pair</strong>, and try to
              build around one suit or a dragon/wind triplet for extra points. You&apos;ll get there!
            </p>
          )}
        </div>

        <div className="border-t border-emerald-100 p-4">
          <button
            onClick={() => setDismissed(true)}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            See full results →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
