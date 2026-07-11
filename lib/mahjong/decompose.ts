import { Meld } from "./melds";
import { TILE_TYPES, isSuitType, typeIndexOf } from "./tile-index";
import { Tile, TileSuit, groupByKey, tileKey } from "./tiles";

export type DecompositionKind = "standard" | "sevenPairs" | "thirteenOrphans";
export type SetGroupKind = "triplet" | "sequence" | "pair" | "single";

export interface SetGroup {
  kind: SetGroupKind;
  suit: TileSuit;
  /** For a sequence, the lowest rank in the run. Otherwise the group's rank. */
  rank: number;
}

export interface Decomposition {
  kind: DecompositionKind;
  concealedGroups: SetGroup[];
  melds: Meld[];
}

interface TileType {
  suit: TileSuit;
  rank: number;
}

const ORPHAN_TYPES: TileType[] = [
  { suit: "characters", rank: 1 },
  { suit: "characters", rank: 9 },
  { suit: "bamboo", rank: 1 },
  { suit: "bamboo", rank: 9 },
  { suit: "dots", rank: 1 },
  { suit: "dots", rank: 9 },
  { suit: "winds", rank: 1 },
  { suit: "winds", rank: 2 },
  { suit: "winds", rank: 3 },
  { suit: "winds", rank: 4 },
  { suit: "dragons", rank: 1 },
  { suit: "dragons", rank: 2 },
  { suit: "dragons", rank: 3 },
];

function backtrack(
  counts: number[],
  setsNeeded: number,
  pairUsed: boolean,
  startIdx: number,
  current: SetGroup[],
  results: SetGroup[][]
) {
  let idx = startIdx;
  while (idx < TILE_TYPES.length && counts[idx] === 0) idx++;

  if (idx === TILE_TYPES.length) {
    if (setsNeeded === 0 && pairUsed) {
      results.push(current.slice());
    }
    return;
  }

  const { suit, rank } = TILE_TYPES[idx];

  if (!pairUsed && counts[idx] >= 2) {
    counts[idx] -= 2;
    current.push({ kind: "pair", suit, rank });
    backtrack(counts, setsNeeded, true, idx, current, results);
    current.pop();
    counts[idx] += 2;
  }

  if (setsNeeded > 0 && counts[idx] >= 3) {
    counts[idx] -= 3;
    current.push({ kind: "triplet", suit, rank });
    backtrack(counts, setsNeeded - 1, pairUsed, idx, current, results);
    current.pop();
    counts[idx] += 3;
  }

  if (setsNeeded > 0 && isSuitType(suit) && rank <= 7) {
    const idx2 = idx + 1;
    const idx3 = idx + 2;
    if (counts[idx2] > 0 && counts[idx3] > 0) {
      counts[idx]--;
      counts[idx2]--;
      counts[idx3]--;
      current.push({ kind: "sequence", suit, rank });
      backtrack(counts, setsNeeded - 1, pairUsed, idx, current, results);
      current.pop();
      counts[idx]++;
      counts[idx2]++;
      counts[idx3]++;
    }
  }
}

function tryStandardDecompositions(concealedTiles: Tile[], setsNeeded: number): SetGroup[][] {
  const expectedCount = setsNeeded * 3 + 2;
  if (concealedTiles.length !== expectedCount) return [];

  const counts = new Array(TILE_TYPES.length).fill(0);
  for (const tile of concealedTiles) counts[typeIndexOf(tile)]++;

  const results: SetGroup[][] = [];
  backtrack(counts, setsNeeded, false, 0, [], results);
  return results;
}

function trySevenPairs(concealedTiles: Tile[]): SetGroup[] | null {
  if (concealedTiles.length !== 14) return null;
  const groups = groupByKey(concealedTiles);
  if (groups.size !== 7) return null;

  const result: SetGroup[] = [];
  for (const tiles of groups.values()) {
    if (tiles.length !== 2) return null;
    result.push({ kind: "pair", suit: tiles[0].suit, rank: tiles[0].rank });
  }
  return result;
}

function tryThirteenOrphans(concealedTiles: Tile[]): SetGroup[] | null {
  if (concealedTiles.length !== 14) return null;
  const groups = groupByKey(concealedTiles);
  const orphanKeys = new Set(ORPHAN_TYPES.map(tileKey));

  let pairKey: string | null = null;
  for (const [key, tiles] of groups) {
    if (!orphanKeys.has(key)) return null;
    if (tiles.length === 2) {
      if (pairKey) return null;
      pairKey = key;
    } else if (tiles.length !== 1) {
      return null;
    }
  }
  if (groups.size !== 13 || !pairKey) return null;

  return ORPHAN_TYPES.map(({ suit, rank }) => ({
    kind: tileKey({ suit, rank }) === pairKey ? "pair" : "single",
    suit,
    rank,
  }));
}

/** Enumerates every valid way to complete a 14-(logical)tile hand, given the
 * concealed tiles and any already-locked exposed/concealed melds. May return
 * an empty array if the hand does not form a valid win. */
export function decomposeHand(concealedTiles: Tile[], melds: Meld[]): Decomposition[] {
  const results: Decomposition[] = [];

  if (melds.length === 0) {
    const sevenPairs = trySevenPairs(concealedTiles);
    if (sevenPairs) {
      results.push({ kind: "sevenPairs", concealedGroups: sevenPairs, melds: [] });
    }
    const thirteenOrphans = tryThirteenOrphans(concealedTiles);
    if (thirteenOrphans) {
      results.push({ kind: "thirteenOrphans", concealedGroups: thirteenOrphans, melds: [] });
    }
  }

  const setsNeeded = 4 - melds.length;
  for (const groups of tryStandardDecompositions(concealedTiles, setsNeeded)) {
    results.push({ kind: "standard", concealedGroups: groups, melds });
  }

  return results;
}

export function isFullyConcealed(melds: Meld[]): boolean {
  return melds.every((meld) => meld.type === "kongConcealed");
}
