"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { useGame } from "@/components/game/GameContext";
import { useLang } from "@/components/i18n/LanguageContext";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { windShort } from "@/lib/i18n/labels";
import { isChinese } from "@/lib/i18n/lang";
import { useBotDriver } from "@/components/game/useBotDriver";
import { useGameSounds } from "@/components/game/useGameSounds";
import { useHumanAutoDraw } from "@/components/game/useHumanAutoDraw";
import { SoundToggle } from "@/components/SoundToggle";
import { FullscreenButton } from "@/components/beta/FullscreenButton";
import { DiceRoll } from "@/components/board/DiceRoll";
import { RoundEndOverlay } from "@/components/board/WinnerBanner";
import { TileFace, TileSize } from "@/components/tiles/TileFace";
import { toGameAction } from "@/lib/mahjong/actions";
import { Meld } from "@/lib/mahjong/melds";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { Wind, nextSeat } from "@/lib/mahjong/state";
import { sortTiles } from "@/lib/mahjong/tiles";

const WIND_GLYPH: Record<number, string> = { 1: "東", 2: "南", 3: "西", 4: "北" };
const WIND_GLYPH_HANS: Record<number, string> = { 1: "东", 2: "南", 3: "西", 4: "北" };
const WIND_LETTER: Record<number, string> = { 1: "E", 2: "S", 3: "W", 4: "N" };

// Each seat gets one accent, keyed by where it sits relative to you, so a
// player's badge dot and their discard zone in the pond share a colour.
type Accent = "amber" | "sky" | "violet" | "rose";
const DOT: Record<Accent, string> = {
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  violet: "bg-violet-400",
  rose: "bg-rose-400",
};
const POND_TINT: Record<Accent, string> = {
  amber: "bg-amber-400/10 border-amber-300/25",
  sky: "bg-sky-400/10 border-sky-300/25",
  violet: "bg-violet-400/10 border-violet-300/25",
  rose: "bg-rose-400/10 border-rose-300/25",
};

/** Face-up meld cluster (exposed pon/chi/kong). */
function MeldRow({ melds, size = "sm" }: { melds: Meld[]; size?: TileSize }) {
  if (melds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {melds.map((m, i) => (
        <div key={`${m.type}-${i}`} className="flex gap-px rounded bg-black/20 p-0.5">
          {m.tiles.map((t) => (
            <TileFace key={t.id} tile={t} size={size} animateIn={false} layoutAnimate={false} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Tiny "N hidden tiles" indicator for an opponent's badge. */
function HandCountMini({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5 text-[10px] opacity-90">
      <span
        className="inline-block h-3 w-2 rounded-[1px] border border-red-950/40"
        style={{ background: "linear-gradient(150deg,#8a2530,#591620)" }}
      />
      {count}
    </span>
  );
}

interface BetaTableProps {
  onNextRound: (nextDealerIndex: number, startingScores: [number, number, number, number], nextRoundWind: Wind) => void;
  onNewMatch: () => void;
}

export function BetaTable({ onNextRound, onNewMatch }: BetaTableProps) {
  const [rollingDice, setRollingDice] = useState(true);
  const thinkingSeat = useBotDriver(rollingDice);
  useHumanAutoDraw(rollingDice);
  const { state, dispatch, humanSeat, botNames, icons } = useGame();
  const { lang, t } = useLang();
  useGameSounds(state, humanSeat, rollingDice);

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const roundEnded = state.turn.phase === "round-ended";

  // Seat geometry: you at the bottom, then clockwise around the table.
  const bottom = humanSeat;
  const right = nextSeat(bottom);
  const top = nextSeat(right);
  const left = nextSeat(top);

  const accentOf = (seat: number): Accent =>
    seat === bottom ? "amber" : seat === right ? "sky" : seat === top ? "violet" : "rose";

  const legal = roundEnded ? [] : getLegalActions(state, humanSeat);
  const discardIds = new Set(
    legal.filter((a) => a.type === "DISCARD").map((a) => (a as { tileId: string }).tileId)
  );
  const winAction = legal.find((a) => a.type === "DECLARE_WIN");
  const ponAction = legal.find((a) => a.type === "CALL_PON");
  const chiActions = legal.filter((a) => a.type === "CALL_CHI");
  const kongActions = legal.filter(
    (a) => a.type === "CALL_KONG_EXPOSED" || a.type === "CALL_KONG_CONCEALED" || a.type === "CALL_KONG_ADDED"
  );
  const passAction = legal.find((a) => a.type === "PASS");
  const hasCall = !roundEnded && (winAction || ponAction || chiActions.length > 0 || kongActions.length > 0 || passAction);

  const doDiscard = (id: string) => {
    dispatch(toGameAction({ type: "DISCARD", tileId: id }, humanSeat));
    setSelectedTileId(null);
  };

  // Tap a tile: first tap selects (lifts), second tap on the same discardable
  // tile discards it. Never auto-selects, so nothing discards by accident.
  const tapTile = (id: string) => {
    if (selectedTileId === id && discardIds.has(id)) return doDiscard(id);
    setSelectedTileId((prev) => (prev === id ? null : id));
  };

  const act = (a: (typeof legal)[number]) => {
    dispatch(toGameAction(a, humanSeat));
    setSelectedTileId(null);
  };

  const drawnId = state.lastDraw?.seat === humanSeat ? state.lastDraw.tile.id : null;
  const myHand = sortTiles(state.players[humanSeat].concealedTiles.filter((t) => t.id !== drawnId));
  const myDrawn = drawnId ? state.players[humanSeat].concealedTiles.find((t) => t.id === drawnId) : null;

  const seatName = (s: number) => (s === humanSeat ? t("common.you") : botNames[s] ?? `Seat ${s + 1}`);

  // ---- render helpers ----

  function Badge({ seat }: { seat: number }) {
    const p = state.players[seat];
    const active = state.turn.activeSeat === seat && !roundEnded;
    return (
      <div
        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
          active ? "bg-amber-400 text-amber-950" : "bg-black/35 text-emerald-50"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${DOT[accentOf(seat)]}`} />
        <span>{icons[seat] ?? "🀄"}</span>
        <span className="max-w-[72px] truncate">{seatName(seat)}</span>
        <span className="rounded bg-black/25 px-1 text-[10px]">{windShort(p.seatWind, lang)}</span>
        {state.dealerIndex === seat && <span className="rounded bg-rose-500 px-1 text-[10px] text-white">莊</span>}
        {seat !== humanSeat && <HandCountMini count={p.concealedTiles.length} />}
        {thinkingSeat === seat && <span className="text-[10px] opacity-80">…</span>}
        <span className="text-[10px] opacity-70">{p.score >= 0 ? `+${p.score}` : p.score}</span>
      </div>
    );
  }

  function Bonuses({ seat, size = "sm" }: { seat: number; size?: TileSize }) {
    const p = state.players[seat];
    if (p.flowers.length === 0 && p.melds.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        {p.flowers.map((t) => (
          <TileFace key={t.id} tile={t} size={size} animateIn={false} layoutAnimate={false} />
        ))}
        <MeldRow melds={p.melds} size={size} />
      </div>
    );
  }

  // A compact opponent card: badge (name/wind/dealer/count/score) + their
  // exposed melds & flowers. NO stack of face-down backs -- that's what used
  // to bury the pond; the hidden-tile count in the badge conveys it instead.
  function OppChip({ seat }: { seat: number }) {
    const active = state.turn.activeSeat === seat && !roundEnded;
    return (
      <div
        className={`flex max-w-full flex-col items-center gap-1 rounded-xl bg-black/25 p-1.5 ${
          active ? "ring-2 ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.5)]" : "ring-1 ring-white/10"
        }`}
      >
        <Badge seat={seat} />
        <Bonuses seat={seat} size="xs" />
      </div>
    );
  }

  // Center compass: prevailing wind glyph, each seat's wind on its side (the
  // dealer's marked red), and the wall/fan info underneath.
  function Compass() {
    const glyphs = lang === "zh-Hans" ? WIND_GLYPH_HANS : WIND_GLYPH;
    const pipText = (seat: number) =>
      isChinese(lang) ? glyphs[state.players[seat].seatWind] : WIND_LETTER[state.players[seat].seatWind];
    const pip = (seat: number, pos: string) => {
      const isDealer = state.dealerIndex === seat;
      return (
        <span
          className={`absolute ${pos} flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
            isDealer ? "bg-rose-500 text-white" : "bg-black/45 text-emerald-100"
          }`}
        >
          {pipText(seat)}
        </span>
      );
    };
    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-950/60">
          <span className="font-serif text-xl font-bold text-amber-200">{glyphs[state.roundWind]}</span>
          {pip(top, "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2")}
          {pip(bottom, "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2")}
          {pip(left, "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2")}
          {pip(right, "right-0 top-1/2 translate-x-1/2 -translate-y-1/2")}
        </div>
        <div className="whitespace-nowrap text-center text-[10px] font-medium leading-tight text-emerald-100/80">
          {t("status.tilesLeft", { n: state.wall.liveTiles.length })} ·{" "}
          {state.ruleset.fanMinimum === 0 ? t("status.fanMin.any") : t("status.fanMin", { n: state.ruleset.fanMinimum })}
        </div>
      </div>
    );
  }

  // A seat's discard zone in the pond: a lightly seat-tinted rectangle of
  // small tiles; the newest discard pops in and stays highlighted.
  function DiscardZone({ seat, className = "" }: { seat: number; className?: string }) {
    const p = state.players[seat];
    const lastId = state.lastDiscard?.seat === seat ? state.lastDiscard.tile.id : null;
    return (
      <div
        className={`flex flex-wrap content-start items-start justify-center gap-0.5 overflow-hidden rounded-lg border p-1 ${POND_TINT[accentOf(seat)]} ${className}`}
      >
        {p.discards.length === 0 && <span className="text-[10px] text-white/25">·</span>}
        {p.discards.map((tile) => (
          <TileFace
            key={tile.id}
            tile={tile}
            size="xs"
            animateIn={tile.id === lastId}
            layoutAnimate={false}
            highlight={tile.id === lastId}
          />
        ))}
      </div>
    );
  }

  function HandTile({ tile, drawn }: { tile: (typeof myHand)[number]; drawn?: boolean }) {
    const selected = tile.id === selectedTileId;
    const discardable = discardIds.has(tile.id);
    return (
      <div className="relative">
        {selected && discardable && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => doDiscard(tile.id)}
            className="absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg"
          >
            {t("action.discard")} ⤒
          </motion.button>
        )}
        <TileFace
          tile={tile}
          size="md"
          animateIn={false}
          layoutAnimate={false}
          lift={!drawn}
          highlight={drawn}
          selected={selected}
          onClick={() => tapTile(tile.id)}
        />
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[100dvh] w-full select-none flex-col overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #2a9d63 0%, #14663d 55%, #0c3f26 100%)" }}
    >
      {/* Top-right: sound + fullscreen + menu (z-40 so its dropdown floats). */}
      <div className="absolute right-3 top-2 z-40 flex items-center gap-1">
        <SoundToggle className="bg-black/30 text-emerald-100 hover:bg-black/50" />
        <FullscreenButton className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-emerald-100 hover:bg-black/50" />
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={t("game.menu")}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-emerald-100 hover:bg-black/50"
        >
          ☰
        </button>
        {menuOpen && (
          <button aria-label={t("common.close")} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[-1] cursor-default" />
        )}
        {menuOpen && (
          <div className="absolute right-0 top-10 flex flex-col gap-1 rounded-xl border border-emerald-900 bg-emerald-950/95 p-1 text-sm shadow-xl">
            <div className="px-2 pt-1">
              <LanguageToggle variant="dark" />
            </div>
            <button onClick={onNewMatch} className="rounded-lg px-4 py-2 text-left text-emerald-100 hover:bg-emerald-900">
              {t("game.newMatch")}
            </button>
            <Link href="/" className="rounded-lg px-4 py-2 text-left text-emerald-100 hover:bg-emerald-900">
              {t("game.exitClassic")}
            </Link>
          </div>
        )}
      </div>

      {/* Band 1: top opponent, centered (kept clear of the top-right controls). */}
      <div className="flex justify-center px-24 pt-2">
        <OppChip seat={top} />
      </div>

      {/* Band 2: left chip | POND | right chip. Chips live in fixed side
          columns so they can NEVER overlap the pond; the pond gets the whole
          flexible centre with its discards and compass fully visible. */}
      <div className="flex min-h-0 flex-1 items-center gap-1 px-1">
        <div className="flex w-[24%] max-w-[150px] shrink-0 items-center justify-start">
          <OppChip seat={left} />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
          <div className="flex w-full max-w-full flex-col items-center gap-1">
            <DiscardZone seat={top} className="min-h-[26px] w-full" />
            <div className="flex w-full items-center justify-center gap-1">
              <DiscardZone seat={left} className="min-h-[44px] flex-1" />
              <Compass />
              <DiscardZone seat={right} className="min-h-[44px] flex-1" />
            </div>
            <DiscardZone seat={bottom} className="min-h-[26px] w-full" />
          </div>
        </div>

        <div className="flex w-[24%] max-w-[150px] shrink-0 items-center justify-end">
          <OppChip seat={right} />
        </div>
      </div>

      {/* Band 3: your area -- badge/bonuses, calls, hint, then the racked hand. */}
      <div className="relative z-10 flex flex-col items-center gap-1 px-2 pb-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge seat={humanSeat} />
          <Bonuses seat={humanSeat} size="sm" />
        </div>

        <AnimatePresence>
          {hasCall && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex flex-wrap items-center justify-center gap-2"
            >
              {winAction && (
                <motion.button
                  animate={{
                    scale: [1, 1.07, 1],
                    boxShadow: [
                      "0 0 0 0 rgba(16,185,129,0.5)",
                      "0 0 22px 6px rgba(16,185,129,0.85)",
                      "0 0 0 0 rgba(16,185,129,0.5)",
                    ],
                  }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  onClick={() => act(winAction)}
                  className="rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2 text-sm font-extrabold text-white ring-2 ring-emerald-200"
                >
                  🏆 {t("action.winShort")}!
                </motion.button>
              )}
              {ponAction && (
                <button onClick={() => act(ponAction)} className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow">
                  {t("action.pong")}
                </button>
              )}
              {kongActions.map((a, i) => (
                <button key={i} onClick={() => act(a)} className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow">
                  {t("action.kong")}
                </button>
              ))}
              {/* Chi shows the two hand tiles it'll use (like the classic bar),
                  not a wordy "Chi 2 Bamboo 3 Bamboo". */}
              {chiActions.map((a) => {
                const [t1, t2] = (a as { tileIds: [string, string] }).tileIds
                  .map((id) => state.players[humanSeat].concealedTiles.find((tt) => tt.id === id))
                  .filter(Boolean);
                return (
                  <button
                    key={(a as { tileIds: [string, string] }).tileIds.join()}
                    onClick={() => act(a)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 py-1 pl-1.5 pr-3 text-white shadow"
                  >
                    <span className="flex -space-x-1">
                      {t1 && <TileFace tile={t1} size="sm" animateIn={false} />}
                      {t2 && <TileFace tile={t2} size="sm" animateIn={false} />}
                    </span>
                    <span className="text-sm font-bold">{t("action.chi")}</span>
                  </button>
                );
              })}
              {passAction && (
                <button onClick={() => act(passAction)} className="rounded-xl border border-white/40 bg-black/30 px-4 py-2 text-sm font-semibold text-white">
                  {t("action.pass")}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!roundEnded && discardIds.size > 0 && !hasCall && (
          <span className="rounded-full bg-black/35 px-3 py-0.5 text-[11px] font-medium text-emerald-100">
            {selectedTileId && discardIds.has(selectedTileId) ? t("hint.tapAgain") : t("hint.tapPick")}
          </span>
        )}

        {/* The hand, on a wooden rack that anchors it off the felt. */}
        <div
          className="flex max-w-full items-end gap-1 overflow-x-auto rounded-2xl px-3 py-2"
          style={{
            background: "linear-gradient(180deg, #6b4a2b 0%, #4a3320 100%)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.35), 0 3px 8px rgba(0,0,0,0.35)",
          }}
        >
          {myHand.map((t) => (
            <HandTile key={t.id} tile={t} />
          ))}
          {myDrawn && (
            <div className="ml-1 border-l-2 border-dashed border-amber-300/60 pl-1.5">
              <HandTile tile={myDrawn} drawn />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>{rollingDice && <DiceRoll onDone={() => setRollingDice(false)} />}</AnimatePresence>

      <AnimatePresence>
        {!rollingDice && roundEnded && resultsOpen && (
          <RoundEndOverlay onNextRound={onNextRound} onNewMatch={onNewMatch} onDismiss={() => setResultsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!rollingDice && roundEnded && !resultsOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setResultsOpen(true)}
            className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 shadow-xl"
          >
            🏆 {t("end.viewResults")}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
