import { Meld } from "../melds";
import { TILE_TYPES, countsFromTiles, isSuitType } from "../tile-index";
import { Tile, groupByKey } from "../tiles";

/** Approximate standard-shape shanten (tiles away from tenpai) for a
 * concealed hand, given how many sets are already locked in by melds.
 * Uses a bounded backtracking search over triplet/sequence/pair-partial
 * blocks -- once the block quota (setsNeeded) and the pair are both
 * satisfied, every remaining branch collapses to a single "isolate the
 * rest" path, which is what keeps this bounded like decompose.ts's search. */
export function calculateStandardShanten(concealedTiles: Tile[], meldCount: number): number {
  const counts = countsFromTiles(concealedTiles);
  const setsNeeded = 4 - meldCount;
  let best = Infinity;

  const onComplete = (sets: number, partials: number, hasPair: boolean) => {
    const usablePartials = Math.min(partials, setsNeeded - sets);
    let shanten = (setsNeeded - sets) * 2 - usablePartials - (hasPair ? 1 : 0);
    if (!hasPair && sets + usablePartials >= setsNeeded && setsNeeded > 0) {
      shanten += 1;
    }
    if (shanten < best) best = shanten;
  };

  search(counts, 0, 0, 0, false, setsNeeded, onComplete);
  return best;
}

function search(
  counts: number[],
  idx: number,
  sets: number,
  partials: number,
  hasPair: boolean,
  setsNeeded: number,
  onComplete: (sets: number, partials: number, hasPair: boolean) => void
) {
  while (idx < TILE_TYPES.length && counts[idx] === 0) idx++;
  if (idx === TILE_TYPES.length) {
    onComplete(sets, partials, hasPair);
    return;
  }

  const { suit, rank } = TILE_TYPES[idx];
  const blocksFull = sets + partials >= setsNeeded;
  let branched = false;

  if (!blocksFull && counts[idx] >= 3) {
    counts[idx] -= 3;
    search(counts, idx, sets + 1, partials, hasPair, setsNeeded, onComplete);
    counts[idx] += 3;
    branched = true;
  }

  if (
    !blocksFull &&
    isSuitType(suit) &&
    rank <= 7 &&
    counts[idx + 1] > 0 &&
    counts[idx + 2] > 0
  ) {
    counts[idx]--;
    counts[idx + 1]--;
    counts[idx + 2]--;
    search(counts, idx, sets + 1, partials, hasPair, setsNeeded, onComplete);
    counts[idx]++;
    counts[idx + 1]++;
    counts[idx + 2]++;
    branched = true;
  }

  if (!hasPair && counts[idx] >= 2) {
    counts[idx] -= 2;
    search(counts, idx, sets, partials, true, setsNeeded, onComplete);
    counts[idx] += 2;
    branched = true;
  }

  if (!blocksFull && counts[idx] >= 2) {
    counts[idx] -= 2;
    search(counts, idx, sets, partials + 1, hasPair, setsNeeded, onComplete);
    counts[idx] += 2;
    branched = true;
  }

  if (!blocksFull && isSuitType(suit) && rank <= 8 && counts[idx + 1] > 0) {
    counts[idx]--;
    counts[idx + 1]--;
    search(counts, idx, sets, partials + 1, hasPair, setsNeeded, onComplete);
    counts[idx]++;
    counts[idx + 1]++;
    branched = true;
  }

  if (!blocksFull && isSuitType(suit) && rank <= 7 && counts[idx + 2] > 0) {
    counts[idx]--;
    counts[idx + 2]--;
    search(counts, idx, sets, partials + 1, hasPair, setsNeeded, onComplete);
    counts[idx]++;
    counts[idx + 2]++;
    branched = true;
  }

  if (!branched) {
    counts[idx]--;
    search(counts, idx, sets, partials, hasPair, setsNeeded, onComplete);
    counts[idx]++;
  }
}

/** Seven-pairs-shape shanten: 6 - (distinct pairs, capped at 7) +
 * (shortfall below 7 distinct tile kinds). Only meaningful for a fully
 * concealed hand -- seven pairs cannot include any exposed meld. */
export function sevenPairsShanten(concealedTiles: Tile[]): number {
  const groups = groupByKey(concealedTiles);
  let pairs = 0;
  for (const tiles of groups.values()) {
    if (tiles.length >= 2) pairs++;
  }
  pairs = Math.min(pairs, 7);
  return 6 - pairs + Math.max(0, 7 - groups.size);
}

export function calculateShanten(concealedTiles: Tile[], melds: Meld[]): number {
  const standard = calculateStandardShanten(concealedTiles, melds.length);
  if (melds.length > 0) return standard;
  return Math.min(standard, sevenPairsShanten(concealedTiles));
}
