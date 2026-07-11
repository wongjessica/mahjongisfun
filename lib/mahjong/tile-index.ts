import { SUIT_TYPES, SuitType, Tile, TileSuit, tileKey } from "./tiles";

export interface TileType {
  suit: TileSuit;
  rank: number;
}

export const TILE_TYPES: TileType[] = (() => {
  const types: TileType[] = [];
  for (const suit of SUIT_TYPES) {
    for (let rank = 1; rank <= 9; rank++) types.push({ suit, rank });
  }
  for (let rank = 1; rank <= 4; rank++) types.push({ suit: "winds", rank });
  for (let rank = 1; rank <= 3; rank++) types.push({ suit: "dragons", rank });
  return types;
})();

const TYPE_INDEX = new Map<string, number>(TILE_TYPES.map((t, i) => [tileKey(t), i]));

export function typeIndexOf(tile: Tile): number {
  const idx = TYPE_INDEX.get(tileKey(tile));
  if (idx === undefined) throw new Error(`Unknown tile type: ${tileKey(tile)}`);
  return idx;
}

export function isSuitType(suit: TileSuit): suit is SuitType {
  return (SUIT_TYPES as TileSuit[]).includes(suit);
}

export function countsFromTiles(tiles: Tile[]): number[] {
  const counts = new Array(TILE_TYPES.length).fill(0);
  for (const tile of tiles) counts[typeIndexOf(tile)]++;
  return counts;
}
