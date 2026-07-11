import { RNG } from "./rng";

export type SuitType = "dots" | "bamboo" | "characters";
export type TileSuit = SuitType | "winds" | "dragons" | "flowers" | "seasons";

export const SUIT_TYPES: SuitType[] = ["dots", "bamboo", "characters"];

// winds: 1=East 2=South 3=West 4=North
// dragons: 1=Red 2=Green 3=White
// flowers/seasons: 1-4, rank N is "owned" by the seat whose seatWind is N
export interface Tile {
  id: string;
  suit: TileSuit;
  rank: number;
}

export function tileKey(tile: Pick<Tile, "suit" | "rank">): string {
  return `${tile.suit}-${tile.rank}`;
}

export function isSameTileType(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function isSuited(tile: Tile): tile is Tile & { suit: SuitType } {
  return SUIT_TYPES.includes(tile.suit as SuitType);
}

export function isHonor(tile: Tile): boolean {
  return tile.suit === "winds" || tile.suit === "dragons";
}

export function isBonus(tile: Tile): boolean {
  return tile.suit === "flowers" || tile.suit === "seasons";
}

export function isTerminal(tile: Tile): boolean {
  return isSuited(tile) && (tile.rank === 1 || tile.rank === 9);
}

export function isSimple(tile: Tile): boolean {
  return isSuited(tile) && tile.rank >= 2 && tile.rank <= 8;
}

export function isTerminalOrHonor(tile: Tile): boolean {
  return isTerminal(tile) || isHonor(tile);
}

export function buildFullSet(): Tile[] {
  const tiles: Tile[] = [];

  for (const suit of SUIT_TYPES) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ id: `${suit}-${rank}-${copy}`, suit, rank });
      }
    }
  }

  for (let rank = 1; rank <= 4; rank++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({ id: `winds-${rank}-${copy}`, suit: "winds", rank });
    }
  }

  for (let rank = 1; rank <= 3; rank++) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({ id: `dragons-${rank}-${copy}`, suit: "dragons", rank });
    }
  }

  for (let rank = 1; rank <= 4; rank++) {
    tiles.push({ id: `flowers-${rank}-0`, suit: "flowers", rank });
  }

  for (let rank = 1; rank <= 4; rank++) {
    tiles.push({ id: `seasons-${rank}-0`, suit: "seasons", rank });
  }

  return tiles;
}

export function shuffle(tiles: Tile[], rng: RNG): Tile[] {
  const result = tiles.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<TileSuit, number> = {
    characters: 0,
    bamboo: 1,
    dots: 2,
    winds: 3,
    dragons: 4,
    flowers: 5,
    seasons: 6,
  };
  return tiles
    .slice()
    .sort(
      (a, b) =>
        suitOrder[a.suit] - suitOrder[b.suit] ||
        a.rank - b.rank ||
        a.id.localeCompare(b.id)
    );
}

export function groupByKey(tiles: Tile[]): Map<string, Tile[]> {
  const map = new Map<string, Tile[]>();
  for (const tile of tiles) {
    const key = tileKey(tile);
    const group = map.get(key);
    if (group) {
      group.push(tile);
    } else {
      map.set(key, [tile]);
    }
  }
  return map;
}
