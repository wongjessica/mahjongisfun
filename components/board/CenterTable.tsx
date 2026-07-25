"use client";

import { motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { useLang } from "@/components/i18n/LanguageContext";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { isChinese } from "@/lib/i18n/lang";
import { tileName, windShort } from "@/lib/i18n/labels";
import { SoundToggle } from "@/components/SoundToggle";
import { InviteButton } from "@/components/online/InviteButton";
import { useProfile } from "@/components/profile/ProfileContext";
import { TileFace } from "@/components/tiles/TileFace";

const WIND_GLYPH: Record<number, string> = { 1: "東", 2: "南", 3: "西", 4: "北" };
const WIND_GLYPH_HANS: Record<number, string> = { 1: "东", 2: "南", 3: "西", 4: "北" };

/** Compact status bar between the discard log and your hand: table wind,
 * tiles left, fan minimum, your money, and the latest discard. Placed there
 * (not up with the opponents) so it stays on-screen on mobile, where you
 * live at the bottom of the page staring at your own tiles. */
export function CenterTable() {
  const { state, humanSeat, botNames, anonymousDiscards, isOnline, roomCode } = useGame();
  const { profile } = useProfile();
  const { lang, t } = useLang();
  const { lastDiscard } = state;
  const balance = isOnline ? profile.wallet.online : profile.wallet.solo;
  const glyph = (lang === "zh-Hans" ? WIND_GLYPH_HANS : WIND_GLYPH)[state.roundWind];
  const roundText = isChinese(lang)
    ? `${windShort(state.roundWind, lang)}圈`
    : `${windShort(state.roundWind, lang)} Round`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-emerald-950/40 bg-gradient-to-br from-emerald-800 to-emerald-900 px-4 py-1.5 shadow-inner">
      <span className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-950/30 px-2.5 py-0.5">
        <span className="text-base font-bold leading-none text-amber-300">{glyph}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200">{roundText}</span>
      </span>

      <span className="text-sm text-emerald-50">{t("status.tilesLeft", { n: state.wall.liveTiles.length })}</span>

      <span className="text-xs font-semibold text-emerald-50">
        {state.ruleset.fanMinimum === 0 ? t("status.fanMin.any") : t("status.fanMin", { n: state.ruleset.fanMinimum })}
      </span>

      <span className={`text-xs font-bold ${balance < 0 ? "text-rose-300" : "text-amber-300"}`}>
        💰 {balance < 0 ? "−" : ""}${Math.abs(balance).toLocaleString()}
      </span>

      <LanguageToggle variant="dark" />

      <SoundToggle className="text-emerald-100 hover:bg-emerald-950/40" />

      {roomCode && <InviteButton code={roomCode} />}

      <span className="hidden h-6 w-px bg-emerald-600/60 sm:block" />

      {/* Keyed on the tile id (no AnimatePresence): the moment the game state
          moves to a new discard, React swaps to it immediately. Using
          AnimatePresence with mode="wait" here caused the callout to lag a
          full exit animation behind the real state in fast mode -- so a pon
          prompt could appear while this still showed the previous discard. */}
      <span className="flex h-11 items-center">
        {lastDiscard ? (
          <motion.span
            key={lastDiscard.tile.id}
            initial={{ opacity: 0, scale: 0.7, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="flex items-center gap-2"
          >
            <span className="text-[11px] font-medium text-emerald-100/90">
              {t("status.discarded", {
                name: anonymousDiscards
                  ? t("status.someone")
                  : lastDiscard.seat === humanSeat
                    ? t("common.you")
                    : botNames[lastDiscard.seat],
              })}
            </span>
            <TileFace tile={lastDiscard.tile} size="sm" animateIn={false} />
            <span className="text-[11px] font-semibold text-amber-300">
              {tileName(lastDiscard.tile, lang)}
            </span>
          </motion.span>
        ) : (
          <span className="text-xs text-emerald-200/60">{t("status.waiting")}</span>
        )}
      </span>
    </div>
  );
}
