import { Decomposition } from "../decompose";
import { FAN_PATTERNS, FanEntry, ScoringContext, flowerBonusPattern, unify } from "./fan-table";

export interface ScoreResult {
  /** Total fan, capped at the ruleset limit -- what a win is worth. */
  fan: number;
  /** Uncapped fan total, checked against the table's fan minimum. Every
   * fan counts here -- including your own seat's flower/season fan and the
   * No Flowers bonus (standard HK rule: your own flowers count toward the
   * minimum same as any other fan). */
  qualifyingFan: number;
  breakdown: FanEntry[];
  decomposition: Decomposition;
}

export function scoreDecomposition(decomposition: Decomposition, ctx: ScoringContext): ScoreResult {
  const sets = unify(decomposition);
  const breakdown: FanEntry[] = [];
  for (const pattern of FAN_PATTERNS) {
    const entry = pattern(sets, decomposition, ctx);
    if (entry) breakdown.push(entry);
  }

  const flowerEntry = flowerBonusPattern(sets, decomposition, ctx);
  if (flowerEntry) {
    breakdown.push(flowerEntry);
  } else if (ctx.flowers.length === 0) {
    // Winning bare-handed -- not a single flower or season all round -- is
    // worth a bonus fan.
    breakdown.push({ label: "No Flowers", fan: 1 });
  }

  const totalFan = breakdown.reduce((sum, entry) => sum + entry.fan, 0);
  return {
    fan: Math.min(totalFan, ctx.ruleset.limitFan),
    qualifyingFan: totalFan,
    breakdown,
    decomposition,
  };
}

/** HK rule: a winning hand is scored under whichever valid decomposition
 * yields the highest fan total. */
export function bestScore(decompositions: Decomposition[], ctx: ScoringContext): ScoreResult | null {
  let best: ScoreResult | null = null;
  for (const decomposition of decompositions) {
    const result = scoreDecomposition(decomposition, ctx);
    if (!best || result.fan > best.fan) best = result;
  }
  return best;
}

export function isValidWinDeclaration(decompositions: Decomposition[], ctx: ScoringContext): boolean {
  if (decompositions.length === 0) return false;
  if (ctx.ruleset.fanMinimum === 0) return true;
  let bestQualifying = 0;
  for (const decomposition of decompositions) {
    const result = scoreDecomposition(decomposition, ctx);
    if (result.qualifyingFan > bestQualifying) bestQualifying = result.qualifyingFan;
  }
  return bestQualifying >= ctx.ruleset.fanMinimum;
}
