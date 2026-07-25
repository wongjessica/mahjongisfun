"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { TileFace } from "@/components/tiles/TileFace";
import { useGame } from "@/components/game/GameContext";
import { useLang } from "@/components/i18n/LanguageContext";
import { fanName, tileName } from "@/lib/i18n/labels";
import { Lang } from "@/lib/i18n/lang";
import { analyzePostmortem, WaitInfo } from "@/lib/tutorial/postmortem";
import { DOLLARS_PER_FAN } from "@/lib/wallet";

const MAX_SHOWN = 5;

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Encouraging, accurate status for a wait tile. We never tell a beginner a
 * tile was "impossible" -- a copy in someone's hand just means it couldn't be
 * self-drawn; a win off their discard was still on the table. */
function waitStatus(wait: WaitInfo, t: T): { live: boolean; text: string } {
  if (wait.copiesInWall > 0) {
    return { live: true, text: t("pm.live", { n: wait.copiesInWall }) };
  }
  const held = wait.copiesHeldByOthers;
  const discarded = wait.copiesDiscarded;
  if (held > 0 && discarded === 0) return { live: false, text: t("pm.deadHeld", { n: held }) };
  if (discarded > 0 && held === 0) return { live: false, text: t("pm.deadDiscarded", { n: discarded }) };
  return { live: false, text: t("pm.deadMixed", { discarded, held }) };
}

function WaitCard({ wait, t, lang }: { wait: WaitInfo; t: T; lang: Lang }) {
  const status = waitStatus(wait, t);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-2.5">
      <TileFace tile={wait.tile} size="sm" animateIn={false} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-emerald-950">{tileName(wait.tile, lang)}</span>
          <span className="text-xs font-semibold text-amber-700">
            {t("end.fan", { n: wait.fan })}
            {wait.fan === 0 ? ` ${t("pm.plainHand")}` : ""}
          </span>
        </div>
        {wait.patterns.length > 0 && (
          <p className="truncate text-[11px] text-gray-500">
            {wait.patterns.map((p) => fanName(p, lang)).join(" · ")}
          </p>
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
  const { lang, t } = useLang();
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
  const moneyLow = `$${bestFan * DOLLARS_PER_FAN}`;
  const moneyHigh = `$${bestFan * 3 * DOLLARS_PER_FAN}`;

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
            {analysis.tenpai ? t("pm.tenpaiTitle") : t("pm.effortTitle")}
          </h2>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          {analysis.tenpai ? (
            <>
              <p className="text-[13px] leading-relaxed text-gray-700">{t("pm.oneAway")}</p>
              <div className="flex flex-col gap-2">
                {shown.map((w) => (
                  <WaitCard key={`${w.tile.suit}-${w.tile.rank}`} wait={w} t={t} lang={lang} />
                ))}
                {extra > 0 && (
                  <p className="text-center text-[11px] text-gray-400">{t("pm.more", { n: extra })}</p>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {bestFan > 0
                  ? t("pm.money", { fan: bestFan, low: moneyLow, high: moneyHigh })
                  : t("pm.zeroFan")}
              </div>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-gray-700">{t("pm.notReady")}</p>
          )}
        </div>

        <div className="border-t border-emerald-100 p-4">
          <button
            onClick={() => setDismissed(true)}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            {t("pm.seeResults")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
