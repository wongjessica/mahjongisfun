import { Decomposition } from "../decompose";
import { FAN_PATTERNS, FanEntry, ScoringContext, unify } from "./fan-table";

export interface ScoreResult {
  fan: number;
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
  const rawFan = breakdown.reduce((sum, entry) => sum + entry.fan, 0);
  return { fan: Math.min(rawFan, ctx.ruleset.limitFan), breakdown, decomposition };
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
  const best = bestScore(decompositions, ctx);
  return (best?.fan ?? 0) >= ctx.ruleset.fanMinimum;
}
