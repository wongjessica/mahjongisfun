import { Tile } from "@/lib/mahjong/tiles";

// Unicode Mahjong Tiles block (U+1F000-U+1F02B) gives us real tile glyphs
// with no image assets needed.
const CHARACTER_BASE = 0x1f006;
const BAMBOO_BASE = 0x1f00f;
const DOTS_BASE = 0x1f018;
const WIND_BASE = 0x1f000;
const DRAGON_BASE = 0x1f003;
const FLOWER_BASE = 0x1f021;
const SEASON_BASE = 0x1f025;
const TILE_BACK = 0x1f02b;

export function tileGlyph(tile: Pick<Tile, "suit" | "rank">): string {
  switch (tile.suit) {
    case "characters":
      return String.fromCodePoint(CHARACTER_BASE + tile.rank);
    case "bamboo":
      return String.fromCodePoint(BAMBOO_BASE + tile.rank);
    case "dots":
      return String.fromCodePoint(DOTS_BASE + tile.rank);
    case "winds":
      return String.fromCodePoint(WIND_BASE + (tile.rank - 1));
    case "dragons":
      return String.fromCodePoint(DRAGON_BASE + tile.rank);
    case "flowers":
      return String.fromCodePoint(FLOWER_BASE + tile.rank);
    case "seasons":
      return String.fromCodePoint(SEASON_BASE + tile.rank);
  }
}

const SIZE_CLASSES = {
  sm: "text-xl w-7 h-10",
  md: "text-3xl w-10 h-14",
  lg: "text-5xl w-14 h-20",
};

interface TileFaceProps {
  tile?: Tile;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: keyof typeof SIZE_CLASSES;
}

export function TileFace({ tile, faceDown, selected, onClick, size = "md" }: TileFaceProps) {
  const glyph = faceDown || !tile ? String.fromCodePoint(TILE_BACK) : tileGlyph(tile);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${SIZE_CLASSES[size]} flex select-none items-center justify-center rounded-md border bg-white leading-none text-black shadow-sm ${
        selected ? "-translate-y-2 border-blue-500 shadow-md" : "border-gray-300"
      } ${onClick ? "cursor-pointer transition-transform hover:-translate-y-1" : "cursor-default"}`}
    >
      {glyph}
    </button>
  );
}
