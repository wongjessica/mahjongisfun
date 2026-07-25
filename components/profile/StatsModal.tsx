"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/lib/firebase/profileDb";
import { useLang } from "@/components/i18n/LanguageContext";
import { fanName } from "@/lib/i18n/labels";
import { favoritePattern, winRate } from "@/lib/profile/types";
import { useProfile } from "./ProfileContext";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

export function StatsModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useProfile();
  const { lang, t } = useLang();
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const s = profile.stats;
  const fav = favoritePattern(s);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    import("@/lib/firebase/profileDb").then(({ readLeaderboard }) =>
      readLeaderboard(user.uid).then((entries) => {
        if (!cancelled) setBoard(entries);
      })
    );
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            aria-label={t("stats.close")}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>

          <h2 className="text-center text-xl font-bold text-slate-900">{t("stats.title")}</h2>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label={t("stats.handsPlayed")} value={s.handsPlayed.toLocaleString()} />
            <Stat label={t("stats.wins")} value={s.wins.toLocaleString()} />
            <Stat label={t("stats.winRate")} value={`${Math.round(winRate(s) * 100)}%`} />
            <Stat label={t("stats.selfDraws")} value={s.selfDraws.toLocaleString()} />
            <Stat label={t("stats.biggestHand")} value={s.biggestFan ? t("end.fan", { n: s.biggestFan }) : "—"} />
            <Stat label={t("stats.favPattern")} value={fav ? fanName(fav, lang) : "—"} />
          </div>
          {s.biggestHand && (
            <p className="mt-2 text-center text-xs text-slate-400">{t("stats.biggestHandLine", { hand: s.biggestHand })}</p>
          )}

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-emerald-800">
            {t("stats.leaderboardTitle")}
          </h3>
          <p className="mb-2 text-xs text-slate-400">{t("stats.leaderboardNote")}</p>

          {board === null ? (
            <p className="py-3 text-center text-sm text-slate-400">{t("common.loading")}</p>
          ) : board.length <= 1 ? (
            <p className="py-3 text-center text-sm text-slate-400">{t("stats.leaderboardEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-1">
              {board.map((e, i) => (
                <div
                  key={e.uid}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                    e.isSelf ? "border-emerald-300 bg-emerald-50/60" : "border-slate-100"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                    <span className="text-lg">{e.icon}</span>
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {e.name}
                      {e.isSelf && <span className="ml-1 text-xs font-normal text-emerald-600">{t("stats.you")}</span>}
                    </span>
                  </span>
                  <span className={`shrink-0 font-mono text-sm font-bold ${e.online < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    {e.online < 0 ? "−" : ""}${Math.abs(e.online).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
