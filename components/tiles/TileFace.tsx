"use client";

import { motion } from "framer-motion";
import { Tile } from "@/lib/mahjong/tiles";

// Real mahjong tiles are hand-drawn here (pip grids, kanji, emoji) rather
// than relying on the Unicode Mahjong Tiles block, whose font coverage is
// inconsistent across platforms (e.g. White Dragon renders as literally
// blank on some systems).

const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 2],
    [2, 0],
  ],
  3: [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
  7: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  8: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  9: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

const DOT_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#dc2626", "#2563eb"];
const KANJI_NUMERALS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const WIND_KANJI: Record<number, string> = { 1: "東", 2: "南", 3: "西", 4: "北" };
const FLOWER_EMOJI: Record<number, string> = { 1: "🌷", 2: "🌸", 3: "🎋", 4: "🌼" };
const SEASON_EMOJI: Record<number, string> = { 1: "🌱", 2: "☀️", 3: "🍁", 4: "❄️" };

function PipGrid({ rank, shape }: { rank: number; shape: "circle" | "bar" }) {
  const positions = PIP_LAYOUT[rank] ?? [];
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[6%] p-[10%]">
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const pipIndex = positions.findIndex(([r, c]) => r === row && c === col);
        return (
          <div key={i} className="flex items-center justify-center">
            {pipIndex !== -1 &&
              (shape === "circle" ? (
                <span
                  className="block rounded-full"
                  style={{
                    width: "85%",
                    height: "85%",
                    background: `radial-gradient(circle at 35% 30%, ${DOT_COLORS[pipIndex % DOT_COLORS.length]}dd, ${DOT_COLORS[pipIndex % DOT_COLORS.length]})`,
                    boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.35), 0 1px 1px rgba(255,255,255,0.5)",
                  }}
                />
              ) : (
                <span
                  className="block rounded-[2px] bg-gradient-to-b from-emerald-500 to-emerald-700"
                  style={{ width: "42%", height: "92%", boxShadow: "inset -1px 0 1px rgba(0,0,0,0.35)" }}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function TileContent({ tile }: { tile: Pick<Tile, "suit" | "rank"> }) {
  switch (tile.suit) {
    case "characters":
      return (
        <div className="flex h-full w-full flex-col items-center justify-center leading-[0.95] gap-[0.08em]">
          <span className="text-[1.15em] font-bold text-slate-900">{KANJI_NUMERALS[tile.rank]}</span>
          <span className="text-[0.85em] font-bold text-red-600">萬</span>
        </div>
      );
    case "dots":
      return <PipGrid rank={tile.rank} shape="circle" />;
    case "bamboo":
      return tile.rank === 1 ? (
        <div className="flex h-full w-full items-center justify-center text-[1.6em]">🐦</div>
      ) : (
        <PipGrid rank={tile.rank} shape="bar" />
      );
    case "winds":
      return (
        <span className="text-[1.5em] font-bold text-blue-800" style={{ fontFamily: "serif" }}>
          {WIND_KANJI[tile.rank]}
        </span>
      );
    case "dragons":
      if (tile.rank === 1) {
        return (
          <span className="text-[1.5em] font-bold text-red-600" style={{ fontFamily: "serif" }}>
            中
          </span>
        );
      }
      if (tile.rank === 2) {
        return (
          <span className="text-[1.5em] font-bold text-emerald-600" style={{ fontFamily: "serif" }}>
            發
          </span>
        );
      }
      return <div className="h-[55%] w-[65%] rounded-[3px] border-[3px] border-blue-700" />;
    case "flowers":
      return <div className="flex h-full w-full items-center justify-center text-[1.3em]">{FLOWER_EMOJI[tile.rank]}</div>;
    case "seasons":
      return <div className="flex h-full w-full items-center justify-center text-[1.3em]">{SEASON_EMOJI[tile.rank]}</div>;
  }
}

const SIZE_CONFIG = {
  sm: { w: 30, h: 42, font: 11 },
  md: { w: 44, h: 60, font: 15 },
  lg: { w: 62, h: 84, font: 21 },
};

export type TileSize = keyof typeof SIZE_CONFIG;

interface TileFaceProps {
  tile?: Tile;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: TileSize;
  /** Set to the tile's stable id to get a smooth FLIP animation when the
   * same tile moves between two places across a render (e.g. hand -> discard
   * pile). Omit for face-down tiles, whose identity shouldn't be revealed. */
  layoutId?: string;
  /** Adds a soft amber glow, used to call out the just-discarded tile. */
  highlight?: boolean;
  animateIn?: boolean;
}

export function TileFace({
  tile,
  faceDown,
  selected,
  onClick,
  size = "md",
  layoutId,
  highlight,
  animateIn = true,
}: TileFaceProps) {
  const { w, h, font } = SIZE_CONFIG[size];
  const isBack = faceDown || !tile;

  return (
    <motion.button
      type="button"
      layout
      layoutId={layoutId}
      onClick={onClick}
      disabled={!onClick}
      initial={animateIn ? { opacity: 0, y: -14, scale: 0.85 } : false}
      animate={{ opacity: 1, y: selected ? -10 : 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.55, y: 12 }}
      whileHover={onClick ? { y: -6 } : undefined}
      whileTap={onClick ? { scale: 0.94 } : undefined}
      transition={{ type: "spring", stiffness: 480, damping: 30 }}
      style={{ width: w, height: h, fontSize: font }}
      className={`relative shrink-0 select-none rounded-[6px] border ${
        selected ? "border-blue-500" : isBack ? "border-red-950/50" : "border-black/10"
      } ${onClick ? "cursor-pointer" : "cursor-default"} ${
        selected ? "shadow-[0_8px_16px_rgba(37,99,235,0.35)]" : "shadow-[0_2px_3px_rgba(0,0,0,0.2)]"
      } ${highlight ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-emerald-900" : ""}`}
    >
      {isBack ? (
        <div
          className="h-full w-full rounded-[5px]"
          style={{
            background: "linear-gradient(155deg, #8a2530 0%, #6d1a24 55%, #591620 100%)",
            boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.18), inset 0 -4px 8px rgba(0,0,0,0.35)",
          }}
        >
          <div className="flex h-full w-full items-center justify-center opacity-30">
            <div className="h-[55%] w-[55%] rounded-full border-2 border-white/60" />
          </div>
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-[5px]"
          style={{ background: "linear-gradient(160deg, #fffef8 0%, #f2efe2 100%)" }}
        >
          <TileContent tile={tile} />
        </div>
      )}
    </motion.button>
  );
}
