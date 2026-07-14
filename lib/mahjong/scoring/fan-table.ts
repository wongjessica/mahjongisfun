import { Decomposition } from "../decompose";
import { isSuitType } from "../tile-index";
import { Tile, TileSuit } from "../tiles";
import { Wind } from "../state";
import { Ruleset } from "./ruleset";

export interface ScoringContext {
  isDealer: boolean;
  selfDraw: boolean;
  isReplacementWin: boolean;
  isRobbingKong: boolean;
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

const allTripletsPattern: FanPattern = (sets, decomposition) => {
  if (decomposition.kind !== "standard") return null;
  const nonPair = sets.filter((s) => s.kind !== "pair");
  if (nonPair.length === 4 && nonPair.every((s) => s.kind === "triplet")) {
    return { label: "All Triplets", fan: 3 };
  }
  return null;
};

const allHonorsPattern: FanPattern = (sets, decomposition) => {
  if (decomposition.kind !== "standard") return null;
  if (sets.every((s) => !isSuitType(s.suit))) return { label: "All Honors", fan: 10 };
  return null;
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

const dealerPattern: FanPattern = (_sets, _decomposition, ctx) =>
  ctx.isDealer ? { label: "Dealer", fan: 1 } : null;

// Seven pairs / thirteen orphans already bake concealment into their fixed
// value, so this only applies to the standard shape to avoid double-counting.
const concealedHandPattern: FanPattern = (_sets, decomposition) => {
  if (decomposition.kind !== "standard") return null;
  return decomposition.melds.every((m) => m.type === "kongConcealed")
    ? { label: "Concealed Hand", fan: 1 }
    : null;
};

// Flowers are pure luck (dealt/drawn, no skill or hand-shape involved), so
// they're kept out of FAN_PATTERNS entirely and applied separately in
// calculate.ts: capped, and excluded from the fan-minimum qualifying check
// (a hand can never win on flowers alone).
export const flowerBonusPattern: FanPattern = (_sets, _decomposition, ctx) => {
  if (ctx.flowers.length === 0) return null;
  const matching = ctx.flowers.filter((f) => f.rank === ctx.seatWind).length;
  const rawFan =
    ctx.flowers.length * ctx.ruleset.flowerFanEach + matching * ctx.ruleset.seatMatchFlowerFanEach;
  const fan = Math.min(rawFan, ctx.ruleset.flowerFanCap);
  return fan > 0 ? { label: "Flowers", fan } : null;
};

const robbingKongPattern: FanPattern = (_sets, _decomposition, ctx) =>
  ctx.isRobbingKong ? { label: "Robbing the Kong", fan: 1 } : null;

const replacementWinPattern: FanPattern = (_sets, _decomposition, ctx) =>
  ctx.isReplacementWin ? { label: "Kong Replacement Win", fan: 1 } : null;

// flowerBonusPattern is deliberately NOT included here -- see its own comment.
export const FAN_PATTERNS: FanPattern[] = [
  thirteenOrphansPattern,
  sevenPairsPattern,
  flushPattern,
  allTripletsPattern,
  allHonorsPattern,
  dragonPattern,
  fourWindsPattern,
  seatRoundWindPattern,
  selfDrawPattern,
  dealerPattern,
  concealedHandPattern,
  robbingKongPattern,
  replacementWinPattern,
];
