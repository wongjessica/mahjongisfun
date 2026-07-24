"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { useGame } from "@/components/game/GameContext";
import { useBotDriver } from "@/components/game/useBotDriver";
import { useGameSounds } from "@/components/game/useGameSounds";
import { useHumanAutoDraw } from "@/components/game/useHumanAutoDraw";
import { SoundToggle } from "@/components/SoundToggle";
import { DiceRoll } from "@/components/board/DiceRoll";
import { RoundEndOverlay } from "@/components/board/WinnerBanner";
import { TileFace, tileLabel } from "@/components/tiles/TileFace";
import { toGameAction } from "@/lib/mahjong/actions";
import { Meld } from "@/lib/mahjong/melds";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { Wind, nextSeat } from "@/lib/mahjong/state";
import { sortTiles } from "@/lib/mahjong/tiles";

const WIND_NAME: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };
const WIND_GLYPH: Record<number, string> = { 1: "東", 2: "南", 3: "西", 4: "北" };
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

/** A single face-down tile back -- the same maroon back as the classic UI, so
 * opponents' hidden tiles read as tiles instead of vanishing into the felt. */
function Back({ w, h }: { w: number; h: number }) {
  return (
    <div
      className="shrink-0 rounded-[3px] border border-red-950/50"
      style={{
        width: w,
        height: h,
        background: "linear-gradient(150deg, #8a2530 0%, #6d1a24 55%, #591620 100%)",
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.18), inset 0 -3px 6px rgba(0,0,0,0.35)",
      }}
    />
  );
}

/** Face-up meld cluster (exposed pon/chi/kong). */
function MeldRow({ melds }: { melds: Meld[] }) {
  if (melds.length === 0) return null;
  return (
    <div className="flex gap-1">
      {melds.map((m, i) => (
        <div key={`${m.type}-${i}`} className="flex gap-px rounded bg-black/20 p-0.5">
          {m.tiles.map((t) => (
            <TileFace key={t.id} tile={t} size="sm" animateIn={false} layoutAnimate={false} />
          ))}
        </div>
      ))}
    </div>
  );
}

type Orient = "top" | "left" | "right";

interface BetaTableProps {
  onNextRound: (nextDealerIndex: number, startingScores: [number, number, number, number], nextRoundWind: Wind) => void;
  onNewMatch: () => void;
}

export function BetaTable({ onNextRound, onNewMatch }: BetaTableProps) {
  const [rollingDice, setRollingDice] = useState(true);
  const thinkingSeat = useBotDriver(rollingDice);
  useHumanAutoDraw(rollingDice);
  const { state, dispatch, humanSeat, botNames, icons } = useGame();
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

  const seatName = (s: number) => (s === humanSeat ? "You" : botNames[s] ?? `Seat ${s + 1}`);

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
        <span className="max-w-[80px] truncate">{seatName(seat)}</span>
        <span className="rounded bg-black/25 px-1 text-[10px]">{WIND_NAME[p.seatWind]}</span>
        {state.dealerIndex === seat && <span className="rounded bg-rose-500 px-1 text-[10px] text-white">莊</span>}
        {thinkingSeat === seat && <span className="text-[10px] opacity-80">…</span>}
        <span className="text-[10px] opacity-70">{p.score >= 0 ? `+${p.score}` : p.score}</span>
      </div>
    );
  }

  // Opponent's hidden hand -- maroon backs during play, revealed (sorted,
  // face-up) once the round ends.
  function OppTiles({ seat, vertical }: { seat: number; vertical: boolean }) {
    const p = state.players[seat];
    if (roundEnded) {
      return (
        <div className={vertical ? "flex flex-col gap-px" : "flex gap-px"}>
          {sortTiles(p.concealedTiles).map((t) => (
            <TileFace key={t.id} tile={t} size="sm" animateIn={false} layoutAnimate={false} />
          ))}
        </div>
      );
    }
    return (
      <div className={vertical ? "flex flex-col gap-px" : "flex gap-px"}>
        {Array.from({ length: p.concealedTiles.length }).map((_, i) =>
          vertical ? <Back key={i} w={28} h={19} /> : <Back key={i} w={19} h={28} />
        )}
      </div>
    );
  }

  function Bonuses({ seat }: { seat: number }) {
    const p = state.players[seat];
    if (p.flowers.length === 0 && p.melds.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {p.flowers.map((t) => (
          <TileFace key={t.id} tile={t} size="sm" animateIn={false} layoutAnimate={false} />
        ))}
        <MeldRow melds={p.melds} />
      </div>
    );
  }

  // One opponent "station": identical template on every edge -- badge (outer),
  // then melds/flowers, then the concealed hand (inner, toward the pond). A
  // glow ring marks whose turn it is.
  function Station({ seat, orient }: { seat: number; orient: Orient }) {
    const active = state.turn.activeSeat === seat && !roundEnded;
    const ring = active
      ? "ring-2 ring-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.55)]"
      : "ring-1 ring-white/10";
    const dir =
      orient === "top" ? "flex-col items-center" : orient === "right" ? "flex-row-reverse items-center" : "flex-row items-center";
    return (
      <div className={`flex ${dir} gap-1.5 rounded-2xl bg-black/20 p-1.5 ${ring}`}>
        <Badge seat={seat} />
        <Bonuses seat={seat} />
        <OppTiles seat={seat} vertical={orient !== "top"} />
      </div>
    );
  }

  // Center compass: prevailing wind glyph, each seat's wind on its side (the
  // dealer's marked red), and the wall/fan info folded in underneath so it's
  // out of the corners.
  function Compass() {
    const pip = (seat: number, pos: string) => {
      const isDealer = state.dealerIndex === seat;
      return (
        <span
          className={`absolute ${pos} flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
            isDealer ? "bg-rose-500 text-white" : "bg-black/45 text-emerald-100"
          }`}
        >
          {WIND_LETTER[state.players[seat].seatWind]}
        </span>
      );
    };
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-950/50">
          <span className="font-serif text-2xl font-bold text-amber-200">{WIND_GLYPH[state.roundWind]}</span>
          {pip(top, "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2")}
          {pip(bottom, "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2")}
          {pip(left, "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2")}
          {pip(right, "right-0 top-1/2 translate-x-1/2 -translate-y-1/2")}
        </div>
        <div className="text-center text-[10px] font-medium leading-tight text-emerald-100/80">
          {state.wall.liveTiles.length} left · {state.ruleset.fanMinimum}-fan
        </div>
      </div>
    );
  }

  // A seat's discard zone in the pond: a lightly seat-tinted rectangle whose
  // tiles grow outward. The newest discard pops in and stays highlighted.
  function DiscardZone({ seat, wide }: { seat: number; wide: boolean }) {
    const p = state.players[seat];
    const lastId = state.lastDiscard?.seat === seat ? state.lastDiscard.tile.id : null;
    return (
      <div
        className={`flex flex-wrap content-start gap-0.5 rounded-lg border p-1 ${POND_TINT[accentOf(seat)]} ${
          wide ? "min-h-[52px] min-w-[124px] max-w-[208px]" : "min-h-[110px] min-w-[64px] max-w-[70px]"
        }`}
      >
        {p.discards.map((t) => (
          <TileFace
            key={t.id}
            tile={t}
            size="sm"
            animateIn={t.id === lastId}
            layoutAnimate={false}
            highlight={t.id === lastId}
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
            Discard ⤒
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
      {/* Top-right: sound + menu (z-40 so its dropdown floats over the table). */}
      <div className="absolute right-3 top-2 z-40 flex items-center gap-1">
        <SoundToggle className="bg-black/30 text-emerald-100 hover:bg-black/50" />
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/30 text-emerald-100 hover:bg-black/50"
        >
          ☰
        </button>
        {menuOpen && (
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[-1] cursor-default" />
        )}
        {menuOpen && (
          <div className="absolute right-0 top-10 flex flex-col rounded-xl border border-emerald-900 bg-emerald-950/95 p-1 text-sm shadow-xl">
            <button onClick={onNewMatch} className="rounded-lg px-4 py-2 text-left text-emerald-100 hover:bg-emerald-900">
              New match
            </button>
            <Link href="/" className="rounded-lg px-4 py-2 text-left text-emerald-100 hover:bg-emerald-900">
              Exit to classic
            </Link>
          </div>
        )}
      </div>

      {/* Band 1: top opponent */}
      <div className="flex justify-center px-2 pt-2">
        <Station seat={top} orient="top" />
      </div>

      {/* Band 2: left station | pond | right station */}
      <div className="flex min-h-0 flex-1 items-center justify-between gap-1 px-1">
        <Station seat={left} orient="left" />

        <div className="grid grid-cols-[auto_auto_auto] grid-rows-[auto_auto_auto] place-items-center gap-1.5">
          <span />
          <DiscardZone seat={top} wide />
          <span />
          <DiscardZone seat={left} wide={false} />
          <Compass />
          <DiscardZone seat={right} wide={false} />
          <span />
          <DiscardZone seat={bottom} wide />
          <span />
        </div>

        <Station seat={right} orient="right" />
      </div>

      {/* Band 3: your area -- badge/bonuses, calls, hint, then the racked hand */}
      <div className="flex flex-col items-center gap-1 px-2 pb-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge seat={humanSeat} />
          <Bonuses seat={humanSeat} />
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
                  🏆 Win!
                </motion.button>
              )}
              {ponAction && (
                <button onClick={() => act(ponAction)} className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow">
                  Pon
                </button>
              )}
              {kongActions.map((a, i) => (
                <button key={i} onClick={() => act(a)} className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2 text-sm font-bold text-white shadow">
                  Kong
                </button>
              ))}
              {chiActions.map((a) => {
                const [t1, t2] = (a as { tileIds: [string, string] }).tileIds
                  .map((id) => state.players[humanSeat].concealedTiles.find((t) => t.id === id))
                  .filter(Boolean);
                return (
                  <button
                    key={(a as { tileIds: [string, string] }).tileIds.join()}
                    onClick={() => act(a)}
                    className="rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-3 py-2 text-xs font-bold text-white shadow"
                  >
                    Chi {t1 && tileLabel(t1)} {t2 && `+ ${tileLabel(t2)}`}
                  </button>
                );
              })}
              {passAction && (
                <button onClick={() => act(passAction)} className="rounded-xl border border-white/40 bg-black/30 px-4 py-2 text-sm font-semibold text-white">
                  Pass
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!roundEnded && discardIds.size > 0 && !hasCall && (
          <span className="rounded-full bg-black/35 px-3 py-0.5 text-[11px] font-medium text-emerald-100">
            {selectedTileId && discardIds.has(selectedTileId) ? "Tap the tile again (or “Discard”) to throw it" : "Tap a tile to pick it, then discard"}
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
            <div className="ml-2 flex flex-col items-center border-l-2 border-dashed border-amber-300/60 pl-2">
              <span className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200/80">Drawn</span>
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
            🏆 View Results
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
