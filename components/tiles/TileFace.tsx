"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Tile } from "@/lib/mahjong/tiles";

// Tile artwork: public domain (CC0) "Hong Kong" set from
// https://github.com/samoheen/mahjong-tiles, copied into public/tiles/.
const DRAGON_FILES: Record<number, string> = { 1: "03-red-dragon", 2: "02-green-dragon", 3: "01-white-dragon" };
const WIND_FILES: Record<number, string> = {
  1: "04-east-wind",
  2: "05-south-wind",
  3: "06-west-wind",
  4: "07-north-wind",
};
const SEASON_FILES: Record<number, string> = { 1: "35-spring", 2: "36-summer", 3: "37-autumn", 4: "38-winter" };
const FLOWER_FILES: Record<number, string> = { 1: "39-plum", 2: "40-orchid", 3: "41-chrysanthemum", 4: "42-bamboo" };

// File numbers below 10 are zero-padded to two digits (e.g. "09-characters-2.svg").
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function tileImageFile(tile: Pick<Tile, "suit" | "rank">): string {
  switch (tile.suit) {
    case "dragons":
      return DRAGON_FILES[tile.rank];
    case "winds":
      return WIND_FILES[tile.rank];
    case "characters":
      return `${pad(7 + tile.rank)}-characters-${tile.rank}`;
    case "dots":
      return `${pad(16 + tile.rank)}-circles-${tile.rank}`;
    case "bamboo":
      return `${pad(25 + tile.rank)}-bamboos-${tile.rank}`;
    case "seasons":
      return SEASON_FILES[tile.rank];
    case "flowers":
      return FLOWER_FILES[tile.rank];
  }
}

/** Preloadable path for a tile's face art, for callers that want to warm
 * the browser cache (e.g. before an animation reveals it). */
export function tileImageSrc(tile: Pick<Tile, "suit" | "rank">): string {
  return `/tiles/${tileImageFile(tile)}.svg`;
}

const SIZE_CONFIG = {
  sm: { w: 30, h: 42 },
  md: { w: 44, h: 62 },
  lg: { w: 62, h: 87 },
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
  const { w, h } = SIZE_CONFIG[size];
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
      style={{ width: w, height: h }}
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
          className="flex h-full w-full items-center justify-center rounded-[5px] p-[8%]"
          style={{ background: "linear-gradient(160deg, #fffef8 0%, #f2efe2 100%)" }}
        >
          <Image
            src={tileImageSrc(tile)}
            alt=""
            width={300}
            height={420}
            draggable={false}
            className="h-full w-full object-contain"
          />
        </div>
      )}
    </motion.button>
  );
}
