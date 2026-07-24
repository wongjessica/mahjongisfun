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

/** A single face-down tile back, in the beta's green felt palette. */
function Back({ w, h, className = "" }: { w: number; h: number; className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-[3px] border border-emerald-950/50 ${className}`}
      style={{
        width: w,
        height: h,
        background: "linear-gradient(150deg, #5cc98a 0%, #33a866 50%, #1f8a4f 100%)",
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.25), inset 0 -3px 6px rgba(0,0,0,0.25)",
      }}
    />
  );
}

/** Face-up meld cluster for opponents. */
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

  // Tap a tile: first tap selects (lifts), second tap on the same discardable
  // tile discards it. Never auto-selects, so nothing discards by accident.
  const tapTile = (id: string) => {
    if (selectedTileId === id && discardIds.has(id)) {
      dispatch(toGameAction({ type: "DISCARD", tileId: id }, humanSeat));
      setSelectedTileId(null);
      return;
    }
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

  // ---- render helpers per seat ----
  function OppLabel({ seat }: { seat: number }) {
    const p = state.players[seat];
    const active = state.turn.activeSeat === seat && !roundEnded;
    return (
      <div
        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
          active ? "bg-amber-400 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.6)]" : "bg-black/30 text-emerald-50"
        }`}
      >
        <span>{icons[seat] ?? "🀄"}</span>
        <span className="max-w-[90px] truncate">{seatName(seat)}</span>
        <span className="rounded bg-black/25 px-1 text-[10px]">{WIND_NAME[p.seatWind]}</span>
        {state.dealerIndex === seat && (
          <span className="rounded bg-rose-500 px-1 text-[10px] text-white">莊</span>
        )}
        {thinkingSeat === seat && <span className="text-[10px] font-medium opacity-80">…</span>}
        <span className="text-[10px] opacity-70">{p.score >= 0 ? `+${p.score}` : p.score}</span>
      </div>
    );
  }

  // Opponent's hidden hand -- backs during play, revealed (sorted, face-up)
  // once the round ends.
  function OppTiles({ seat, vertical }: { seat: number; vertical: boolean }) {
    const p = state.players[seat];
    if (roundEnded) {
      const cls = vertical ? "flex flex-col gap-px" : "flex gap-px";
      return (
        <div className={cls}>
          {sortTiles(p.concealedTiles).map((t) => (
            <TileFace key={t.id} tile={t} size="sm" animateIn={false} layoutAnimate={false} />
          ))}
        </div>
      );
    }
    const n = p.concealedTiles.length;
    return (
      <div className={vertical ? "flex flex-col gap-px" : "flex gap-px"}>
        {Array.from({ length: n }).map((_, i) =>
          vertical ? <Back key={i} w={30} h={20} /> : <Back key={i} w={20} h={30} />
        )}
      </div>
    );
  }

  function Bonuses({ seat }: { seat: number }) {
    const p = state.players[seat];
    if (p.flowers.length === 0 && p.melds.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {p.flowers.map((t) => (
          <TileFace key={t.id} tile={t} size="sm" animateIn={false} layoutAnimate={false} />
        ))}
        <MeldRow melds={p.melds} />
      </div>
    );
  }

  // Per-seat discard group, rotated to face its player.
  function Discards({ seat, rotate }: { seat: number; rotate: number }) {
    const p = state.players[seat];
    const lastId = state.lastDiscard?.seat === seat ? state.lastDiscard.tile.id : null;
    return (
      <div
        className="flex max-w-[220px] flex-wrap content-start gap-0.5"
        style={{ transform: `rotate(${rotate}deg)` }}
      >
        {p.discards.map((t) => (
          <TileFace
            key={t.id}
            tile={t}
            size="sm"
            animateIn={false}
            layoutAnimate={false}
            highlight={t.id === lastId}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="relative h-[100dvh] w-full select-none overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #2a9d63 0%, #14663d 55%, #0c3f26 100%)" }}
    >
      {/* Top-left: round wind + wall */}
      <div className="absolute left-3 top-2 z-10 leading-tight">
        <div className="flex items-center gap-1.5 font-serif text-emerald-100 drop-shadow">
          <span className="text-2xl font-bold">{WIND_GLYPH[state.roundWind]}</span>
          <div>
            <div className="text-sm font-bold">{WIND_NAME[state.roundWind]} Round</div>
            <div className="text-xs text-emerald-200/80">{state.wall.liveTiles.length} tiles left · {state.ruleset.fanMinimum}-fan min</div>
          </div>
        </div>
      </div>

      {/* Top-right: sound + menu. z-40 so the open dropdown floats above the
          opponents' discard columns (z-10) and the call buttons (z-20) instead
          of being painted over by the right-side tiles. */}
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
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-[-1] cursor-default"
          />
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

      {/* Top opponent (across) */}
      <div className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 flex-col items-center gap-1">
        <OppLabel seat={top} />
        <OppTiles seat={top} vertical={false} />
        <Bonuses seat={top} />
      </div>

      {/* Left opponent */}
      <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1">
        <OppLabel seat={left} />
        <OppTiles seat={left} vertical />
        <Bonuses seat={left} />
      </div>

      {/* Right opponent */}
      <div className="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1">
        <OppLabel seat={right} />
        <OppTiles seat={right} vertical />
        <Bonuses seat={right} />
      </div>

      {/* Center: the discard pool, each player's throws in front of them */}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center">
        <div className="grid grid-cols-3 items-center justify-items-center gap-1">
          <div />
          <Discards seat={top} rotate={180} />
          <div />
          <Discards seat={left} rotate={90} />
          <div className="h-12 w-12 rounded-full border border-emerald-200/20" />
          <Discards seat={right} rotate={-90} />
          <div />
          <Discards seat={bottom} rotate={0} />
          <div />
        </div>
      </div>

      {/* Your bonuses (flowers + melds), just above your hand */}
      <div className="absolute bottom-24 left-3 z-10">
        <Bonuses seat={humanSeat} />
      </div>

      {/* Call buttons */}
      <AnimatePresence>
        {!roundEnded && (winAction || ponAction || chiActions.length > 0 || kongActions.length > 0 || passAction) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2"
          >
            {winAction && (
              <button onClick={() => act(winAction)} className="rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-lg">
                🏆 Win
              </button>
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

      {/* Your hand (bottom) */}
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-end gap-1">
        {myHand.map((t) => (
          <TileFace
            key={t.id}
            tile={t}
            size="md"
            layoutAnimate={false}
            selected={t.id === selectedTileId}
            onClick={() => tapTile(t.id)}
          />
        ))}
        {myDrawn && (
          <div className="ml-3 border-l-2 border-dashed border-amber-300/60 pl-3">
            <TileFace
              tile={myDrawn}
              size="md"
              animateIn={false}
              layoutAnimate={false}
              lift={false}
              highlight
              selected={myDrawn.id === selectedTileId}
              onClick={() => tapTile(myDrawn.id)}
            />
          </div>
        )}
      </div>

      {/* Your identity + balance (bottom-right corner) */}
      <div className="absolute bottom-2 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-xs font-bold text-amber-200">
        {icons[humanSeat] ?? "🙂"} You
        <span className="rounded bg-black/25 px-1 text-[10px] text-emerald-100">{WIND_NAME[state.players[humanSeat].seatWind]}</span>
        {state.dealerIndex === humanSeat && <span className="rounded bg-rose-500 px-1 text-[10px] text-white">Banker</span>}
        <span className="text-[10px]">{state.players[humanSeat].score >= 0 ? `+${state.players[humanSeat].score}` : state.players[humanSeat].score}</span>
      </div>

      {/* A small hint when it's your turn to discard */}
      {!roundEnded && discardIds.size > 0 && (
        <div className="pointer-events-none absolute bottom-[92px] left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-emerald-100">
          {selectedTileId && discardIds.has(selectedTileId) ? "Tap again to discard" : "Tap a tile to discard"}
        </div>
      )}

      <AnimatePresence>{rollingDice && <DiceRoll onDone={() => setRollingDice(false)} />}</AnimatePresence>

      <AnimatePresence>
        {!rollingDice && roundEnded && resultsOpen && (
          <RoundEndOverlay
            onNextRound={onNextRound}
            onNewMatch={onNewMatch}
            onDismiss={() => setResultsOpen(false)}
          />
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
