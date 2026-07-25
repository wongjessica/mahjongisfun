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
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}/tiles/${tileImageFile(tile)}.svg`;
}

const WIND_LABELS: Record<number, string> = {
  1: "East Wind",
  2: "South Wind",
  3: "West Wind",
  4: "North Wind",
};
const DRAGON_LABELS: Record<number, string> = { 1: "Red Dragon", 2: "Green Dragon", 3: "White Dragon" };
const FLOWER_LABELS: Record<number, string> = { 1: "Plum", 2: "Orchid", 3: "Chrysanthemum", 4: "Bamboo Flower" };
const SEASON_LABELS: Record<number, string> = { 1: "Spring", 2: "Summer", 3: "Autumn", 4: "Winter" };

/** Plain-English name for a tile, e.g. "3 Characters", "Red Dragon",
 * "East Wind" -- used as always-visible captions in the discard board and
 * as a native tooltip everywhere else, so a non-expert can follow along. */
export function tileLabel(tile: Pick<Tile, "suit" | "rank">): string {
  switch (tile.suit) {
    case "characters":
      return `${tile.rank} Characters`;
    case "dots":
      return `${tile.rank} Dots`;
    case "bamboo":
      return `${tile.rank} Bamboo`;
    case "winds":
      return WIND_LABELS[tile.rank];
    case "dragons":
      return DRAGON_LABELS[tile.rank];
    case "flowers":
      return FLOWER_LABELS[tile.rank];
    case "seasons":
      return SEASON_LABELS[tile.rank];
  }
}

// Fixed 5:7 aspect ratio at every breakpoint. md/lg shrink on narrow phone
// viewports and grow back to their original desktop size at the sm: (640px)
// breakpoint, so a full hand of 14 tiles never forces horizontal scrolling.
const SIZE_CLASSES = {
  sm: "w-[30px] h-[42px]",
  md: "w-9 h-[50px] sm:w-11 sm:h-[62px]",
  lg: "w-11 h-[62px] sm:w-[62px] sm:h-[87px]",
};

export type TileSize = keyof typeof SIZE_CLASSES;

const SPEED_SPRING = {
  fast: { type: "spring" as const, stiffness: 700, damping: 42 },
  slow: { type: "spring" as const, stiffness: 480, damping: 30 },
};

interface TileFaceProps {
  tile?: Tile;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  size?: TileSize;
  /** Set to the tile's stable id to get a smooth FLIP animation when the
   * same tile moves between two places across a render (e.g. hand -> discard
   * pile). Omit for face-down tiles, whose identity shouldn't be revealed. */
  layoutId?: string;
  /** Adds a soft amber glow, used to call out the just-discarded tile. */
  highlight?: boolean;
  animateIn?: boolean;
  /** Framer Motion's `layout` prop smoothly animates ANY position/size shift
   * from a reflow, not just the ones layoutId is meant for -- which means a
   * tile sitting right under a text label (e.g. the "Drawn" slot) can slide
   * through that label mid-transition whenever a sibling changes height
   * (a new flower, a hand row wrapping). Set false for tiles that don't
   * need FLIP smoothness so a reflow just snaps them into place instead. */
  layoutAnimate?: boolean;
  /** A selected/hovered tile normally lifts by a few px (a "picked up off
   * the rack" cue) -- but that's a CSS transform, not a layout change, so it
   * can slide the tile straight into whatever sits right above it (e.g. the
   * "Drawn" slot's label, which has little clearance). Set false for tiles
   * in a tightly-spaced spot that doesn't need the lift cue. */
  lift?: boolean;
  /** Fast: snappier, near-instant. Slow: gentler, more "immersive" spring.
   * Defaults to "slow" so callers outside a game (e.g. the setup screen's
   * decorative tiles) keep the original cinematic feel. */
  speed?: "fast" | "slow" | "learn";
  /** Seconds to delay the entrance animation (not layout repositioning) --
   * used to stagger the initial deal one tile at a time in slow mode. */
  enterDelay?: number;
}

export function TileFace({
  tile,
  faceDown,
  selected,
  onClick,
  onDoubleClick,
  size = "md",
  layoutId,
  highlight,
  animateIn = true,
  layoutAnimate = true,
  lift = true,
  speed = "slow",
  enterDelay = 0,
}: TileFaceProps) {
  const isBack = faceDown || !tile;
  // The tutorial's "learn" pace only slows bots, not tile animations -- map it
  // to the gentle "slow" spring here.
  const spring = SPEED_SPRING[speed === "fast" ? "fast" : "slow"];

  // Only a genuinely clickable tile should be a <button> -- a decorative
  // tile (e.g. composited into the ActionBar's discard preview button) must
  // render as a <div>, since nesting <button> inside <button> is invalid
  // HTML and breaks hydration.
  const Wrapper = onClick ? motion.button : motion.div;

  const sharedProps = {
    title: tile ? tileLabel(tile) : undefined,
    layout: layoutAnimate,
    // layoutId drives the shared-element FLIP (a tile "flying" between hand,
    // drawn slot, discard, and melds). That shared transition is exactly what
    // occasionally strands a tile at opacity 0 -- an invisible gap in the
    // hand. Tie it to layoutAnimate so a caller that opts out of layout
    // animation also opts out of the FLIP, and can never be stranded.
    layoutId: layoutAnimate ? layoutId : undefined,
    initial: animateIn ? { opacity: 0, y: -14, scale: 0.85 } : false,
    animate: { opacity: 1, y: selected && lift ? -10 : 0, scale: 1 },
    exit: { opacity: 0, scale: 0.55, y: 12 },
    whileHover: onClick && lift ? { y: -6 } : undefined,
    whileTap: onClick ? { scale: 0.94 } : undefined,
    // Delay only the entrance (opacity/y/scale), never layout repositioning
    // -- a delayed FLIP would make repositioning feel laggy in slow mode.
    transition: enterDelay
      ? {
          opacity: { ...spring, delay: enterDelay },
          y: { ...spring, delay: enterDelay },
          scale: { ...spring, delay: enterDelay },
          layout: spring,
        }
      : spring,
    className: `relative shrink-0 select-none rounded-[6px] border ${SIZE_CLASSES[size]} ${
      selected ? "border-blue-500" : isBack ? "border-red-950/50" : "border-black/10"
    } ${onClick ? "cursor-pointer" : "cursor-default"} ${
      selected ? "shadow-[0_8px_16px_rgba(37,99,235,0.35)]" : "shadow-[0_2px_3px_rgba(0,0,0,0.2)]"
    } ${highlight ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-emerald-900" : ""}`,
  };

  return (
    <Wrapper {...sharedProps} {...(onClick ? { type: "button", onClick, onDoubleClick } : {})}>
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
    </Wrapper>
  );
}
