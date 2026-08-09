import { Decomposition } from "../decompose";
import { isSuitType } from "../tile-index";
import { Tile, TileSuit } from "../tiles";
import { Wind } from "../state";
import { Ruleset } from "./ruleset";

export interface ScoringContext {
  selfDraw: boolean;
  isReplacementWin: boolean;
  isRobbingKong: boolean;
  /** True when the live wall was empty at the moment of winning: a
   * last-tile self-draw, or a win off the discard made after the final
   * draw. Either way it's the round's last possible win. */
  isLastTile: boolean;
  /** tileKey of the tile that completed the hand (drawn or claimed), or
   * null when unknown -- lets patterns that care HOW a set was finished
   * (Kan Kan Wo permits a discard only for the pair) tell the difference. */
  winningTileKey: string | null;
  seatWind: Wind;
  roundWind: Wind;
  flowers: Tile[];
  ruleset: Ruleset;
}

export interface UnifiedSet {
  kind: "triplet" | "sequence" | "pair" | "single";
  suit: TileSuit;
  rank: number;
}

export interface FanEntry {
  label: string;
  fan: number;
}

export type FanPattern = (
  sets: UnifiedSet[],
  decomposition: Decomposition,
  ctx: ScoringContext
) => FanEntry | null;

export function unify(decomposition: Decomposition): UnifiedSet[] {
  const fromConcealed: UnifiedSet[] = decomposition.concealedGroups.map((g) => ({
    kind: g.kind,
    suit: g.suit,
    rank: g.rank,
  }));
  const fromMelds: UnifiedSet[] = decomposition.melds.map((m) => ({
    kind: m.type === "chi" ? "sequence" : "triplet",
    suit: m.tiles[0].suit,
    rank: m.type === "chi" ? Math.min(...m.tiles.map((t) => t.rank)) : m.tiles[0].rank,
  }));
  return [...fromConcealed, ...fromMelds];
}

// Full/half flush are mutually exclusive by construction (one function, one
// return value) rather than two overlapping patterns + an exclusivity table.
const flushPattern: FanPattern = (sets, decomposition) => {
  if (decomposition.kind === "thirteenOrphans") return null;
  const suits = new Set(sets.map((s) => s.suit));
  const suitedSuits = [...suits].filter(isSuitType);
  const hasHonor = [...suits].some((s) => !isSuitType(s));
  if (suitedSuits.length === 1 && !hasHonor) return { label: "Full Flush", fan: 7 };
  if (suitedSuits.length === 1 && hasHonor) return { label: "Half Flush", fan: 3 };
  return null;
};

const allTripletsPattern: FanPattern = (sets, decomposition, ctx) => {
  if (decomposition.kind !== "standard") return null;
  const nonPair = sets.filter((s) => s.kind !== "pair");
  if (nonPair.length !== 4 || !nonPair.every((s) => s.kind === "triplet")) {
    return null;
  }

  // Kan Kan Wo: every triplet self-assembled (fully concealed -- no chi/
  // pon/exposed kong; a concealed kong is fine), won by self-draw OR by
  // claiming a discard for the PAIR only (a discard completing a triplet
  // would mean that triplet wasn't self-drawn). Valued so the classic hand
  // totals exactly 10 with its inseparable companions: self-draw case
  // also scores Self-Draw (1) + Concealed Hand (1) on top of 8; the
  // pair-from-discard case only Concealed Hand (1) on top of 9.
  const fullyConcealed = decomposition.melds.every((m) => m.type === "kongConcealed");
  const pair = sets.find((s) => s.kind === "pair");
  const wonThePair =
    ctx.winningTileKey !== null && pair !== undefined && ctx.winningTileKey === `${pair.suit}-${pair.rank}`;
  if (fullyConcealed && (ctx.selfDraw || wonThePair)) {
    return { label: "Kan Kan Wo", fan: ctx.selfDraw ? 8 : 9 };
  }

  return { label: "All Triplets", fan: 3 };
};

// "Ping Wu" / All Sequences: all 4 sets are chows (no triplets/kongs,
// concealed or exposed either way), plus any pair. The pair may be a dragon
// or a seat/round wind -- that carries no faan of its own (dragon/wind faan
// only comes from a TRIPLET, via dragonPattern / seatRoundWindPattern), but
// it's a perfectly legal pair and does NOT disqualify the hand from 平糊.
const allSequencesPattern: FanPattern = (sets, decomposition) => {
  if (decomposition.kind !== "standard") return null;
  const nonPair = sets.filter((s) => s.kind !== "pair");
  if (nonPair.length !== 4 || !nonPair.every((s) => s.kind === "sequence")) return null;
  if (!sets.some((s) => s.kind === "pair")) return null;
  return { label: "All Sequences", fan: 1 };
};

const allHonorsPattern: FanPattern = (sets, decomposition) => {
  if (decomposition.kind !== "standard") return null;
  if (sets.every((s) => !isSuitType(s.suit))) return { label: "All Honors", fan: 10 };
  return null;
};

// All Terminals (every set built purely from 1s and 9s) is a limit hand;
// Terminals & Honors (every set is terminal OR honor, with at least one
// honor) is one step down. One branching function, so the two can never
// double-count each other. Both stack with All Triplets, which such hands
// structurally always are -- a sequence can never be all-terminal (1-2-3
// contains a 2), which the explicit sequence check below encodes, since
// unify() records a sequence only by its lowest rank.
const terminalHandsPattern: FanPattern = (sets, decomposition, ctx) => {
  if (decomposition.kind === "thirteenOrphans") return null;
  if (sets.some((s) => s.kind === "sequence")) return null;
  const isTerminalSet = (s: UnifiedSet) => isSuitType(s.suit) && (s.rank === 1 || s.rank === 9);
  const isHonorSet = (s: UnifiedSet) => !isSuitType(s.suit);
  if (!sets.every((s) => isTerminalSet(s) || isHonorSet(s))) return null;
  return sets.every(isTerminalSet)
    ? { label: "All Terminals", fan: ctx.ruleset.limitFan }
    : { label: "Terminals & Honors", fan: 4 };
};

const sevenPairsPattern: FanPattern = (_sets, decomposition) =>
  decomposition.kind === "sevenPairs" ? { label: "Seven Pairs", fan: 4 } : null;

const thirteenOrphansPattern: FanPattern = (_sets, decomposition, ctx) =>
  decomposition.kind === "thirteenOrphans"
    ? { label: "Thirteen Orphans", fan: ctx.ruleset.limitFan }
    : null;

// Small/great three dragons subsume the per-triplet "yakuhai" value for the
// same tiles, so this is one branching function rather than stacked ones.
const dragonPattern: FanPattern = (sets) => {
  const dragonTriplets = sets.filter((s) => s.kind === "triplet" && s.suit === "dragons");
  const pair = sets.find((s) => s.kind === "pair");
  if (dragonTriplets.length === 3) return { label: "Great Three Dragons", fan: 8 };
  if (dragonTriplets.length === 2 && pair?.suit === "dragons") {
    return { label: "Small Three Dragons", fan: 5 };
  }
  if (dragonTriplets.length > 0) return { label: "Dragon Triplet", fan: dragonTriplets.length };
  return null;
};

// Structural "how many wind triplets total" bonus — independent of which
// specific winds they are, so it can stack with seatRoundWindPattern below.
const fourWindsPattern: FanPattern = (sets, _decomposition, ctx) => {
  const windTriplets = sets.filter((s) => s.kind === "triplet" && s.suit === "winds");
  const pair = sets.find((s) => s.kind === "pair");
  if (windTriplets.length === 4) return { label: "Great Four Winds", fan: ctx.ruleset.limitFan };
  if (windTriplets.length === 3 && pair?.suit === "winds") {
    return { label: "Small Four Winds", fan: 6 };
  }
  return null;
};

const seatRoundWindPattern: FanPattern = (sets, _decomposition, ctx) => {
  const windTriplets = sets.filter((s) => s.kind === "triplet" && s.suit === "winds");
  let fan = 0;
  for (const t of windTriplets) {
    if (t.rank === ctx.seatWind) fan += 1;
    if (t.rank === ctx.roundWind) fan += 1;
  }
  return fan > 0 ? { label: "Seat/Round Wind", fan } : null;
};

const selfDrawPattern: FanPattern = (_sets, _decomposition, ctx) =>
  ctx.selfDraw ? { label: "Self-Draw", fan: 1 } : null;

// Seven pairs / thirteen orphans already bake concealment into their fixed
// value, so this only applies to the standard shape to avoid double-counting.
const concealedHandPattern: FanPattern = (_sets, decomposition) => {
  if (decomposition.kind !== "standard") return null;
  return decomposition.melds.every((m) => m.type === "kongConcealed")
    ? { label: "Concealed Hand", fan: 1 }
    : null;
};

// Applied separately in calculate.ts (alongside the No Flowers bonus)
// rather than through FAN_PATTERNS, purely so the flower/no-flower pairing
// lives in one place. Only your OWN seat's flower/season (rank === seatWind)
// counts -- an off-seat flower is worth nothing, so at most 2 fan is
// achievable (your own flower tile + your own season tile), which is what
// the cap reflects. House rule: flower fan counts toward the win minimum
// like any other fan.
export const flowerBonusPattern: FanPattern = (_sets, _decomposition, ctx) => {
  const matching = ctx.flowers.filter((f) => f.rank === ctx.seatWind).length;
  if (matching === 0) return null;
  const fan = Math.min(matching * ctx.ruleset.seatMatchFlowerFanEach, ctx.ruleset.flowerFanCap);
  return fan > 0 ? { label: "Flowers", fan } : null;
};

const robbingKongPattern: FanPattern = (_sets, _decomposition, ctx) =>
  ctx.isRobbingKong ? { label: "Robbing the Kong", fan: 1 } : null;

const replacementWinPattern: FanPattern = (_sets, _decomposition, ctx) =>
  ctx.isReplacementWin ? { label: "Kong Replacement Win", fan: 1 } : null;

const lastTilePattern: FanPattern = (_sets, _decomposition, ctx) =>
  ctx.isLastTile ? { label: "Last Tile", fan: 1 } : null;

// flowerBonusPattern is deliberately NOT included here -- see its own comment.
export const FAN_PATTERNS: FanPattern[] = [
  thirteenOrphansPattern,
  sevenPairsPattern,
  flushPattern,
  allTripletsPattern,
  allSequencesPattern,
  allHonorsPattern,
  terminalHandsPattern,
  dragonPattern,
  fourWindsPattern,
  seatRoundWindPattern,
  selfDrawPattern,
  concealedHandPattern,
  robbingKongPattern,
  replacementWinPattern,
  lastTilePattern,
];
