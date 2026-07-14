import { describe, expect, it } from "vitest";
import { decomposeHand } from "../decompose";
import { bestScore, isValidWinDeclaration } from "../scoring/calculate";
import { ScoringContext } from "../scoring/fan-table";
import { createRuleset } from "../scoring/ruleset";
import {
  allTripletsHand,
  ambiguousDecompositionHand,
  fullFlushHand,
  halfFlushHand,
  sevenPairsHand,
  t,
  thirteenOrphansHand,
  twoFanHand,
} from "../fixtures/hands";
import { Meld } from "../melds";
import { Tile } from "../tiles";

function baseContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    selfDraw: false,
    isReplacementWin: false,
    isRobbingKong: false,
    seatWind: 2,
    roundWind: 1,
    flowers: [],
    ruleset: createRuleset(0),
    ...overrides,
  };
}

describe("scoring", () => {
  it("scores a full flush hand and does not also double-count half flush", () => {
    const decompositions = decomposeHand(fullFlushHand(), []);
    const result = bestScore(decompositions, baseContext())!;
    const labels = result.breakdown.map((b) => b.label);
    expect(labels).toContain("Full Flush");
    expect(labels).not.toContain("Half Flush");
    expect(result.fan).toBeGreaterThanOrEqual(7);
  });

  it("scores a half flush hand as half flush, not full flush", () => {
    const decompositions = decomposeHand(halfFlushHand(), []);
    const result = bestScore(decompositions, baseContext())!;
    const labels = result.breakdown.map((b) => b.label);
    expect(labels).toContain("Half Flush");
    expect(labels).not.toContain("Full Flush");
  });

  it("scores an all-triplets hand with the All Triplets pattern", () => {
    const decompositions = decomposeHand(allTripletsHand(), []);
    const result = bestScore(decompositions, baseContext())!;
    expect(result.breakdown.map((b) => b.label)).toContain("All Triplets");
  });

  it("scores seven pairs at a fixed fan value", () => {
    const decompositions = decomposeHand(sevenPairsHand(), []);
    const result = bestScore(decompositions, baseContext())!;
    expect(result.breakdown.map((b) => b.label)).toContain("Seven Pairs");
  });

  it("scores thirteen orphans at the limit", () => {
    const decompositions = decomposeHand(thirteenOrphansHand(), []);
    const ruleset = createRuleset(0);
    const result = bestScore(decompositions, baseContext({ ruleset }))!;
    expect(result.fan).toBe(ruleset.limitFan);
  });

  it("picks the highest-fan decomposition for an ambiguous hand", () => {
    const decompositions = decomposeHand(ambiguousDecompositionHand(), []);
    const result = bestScore(decompositions, baseContext())!;
    expect(result.breakdown.map((b) => b.label)).toContain("All Triplets");
    expect(result.fan).toBeGreaterThanOrEqual(3);
  });

  it("gates DECLARE_WIN legality on the fan minimum, not the fan math itself", () => {
    // twoFanHand has no named pattern of its own; its only fan comes from
    // the automatic Concealed Hand bonus (+1), which is below any nonzero
    // minimum -- that's exactly the scenario the 0/3-fan toggle should gate.
    const decompositions = decomposeHand(twoFanHand(), []);
    const score = bestScore(decompositions, baseContext())!;
    expect(score.fan).toBe(1);

    expect(isValidWinDeclaration(decompositions, baseContext({ ruleset: createRuleset(0) }))).toBe(
      true
    );
    expect(isValidWinDeclaration(decompositions, baseContext({ ruleset: createRuleset(3) }))).toBe(
      false
    );
  });

  it("adds a self-draw bonus fan on top of the base hand pattern", () => {
    const decompositions = decomposeHand(twoFanHand(), []);
    const fans = [false, true].map(
      (selfDraw) => bestScore(decompositions, baseContext({ selfDraw }))!.fan
    );
    // baseline Concealed Hand (1), +1 more when self-draw
    expect(fans).toEqual([1, 2]);
  });

  it("only counts a flower/season that matches the holder's own seat, up to the cap", () => {
    const decompositions = decomposeHand(twoFanHand(), []);
    const matching: Tile[] = [
      { id: "f1", suit: "flowers", rank: 1 },
      { id: "f2", suit: "seasons", rank: 1 },
    ];
    const offSeat: Tile[] = [{ id: "f3", suit: "flowers", rank: 2 }];

    // Two seat-matching bonus tiles (own flower + own season): capped at 2.
    const matchingResult = bestScore(decompositions, baseContext({ seatWind: 1, flowers: matching }))!;
    expect(matchingResult.breakdown.map((b) => b.label)).toContain("Flowers");
    expect(matchingResult.fan).toBe(1 + 2); // Concealed Hand (1) + Flowers (2, capped)

    // An off-seat flower/season is worth nothing at all.
    const offSeatResult = bestScore(decompositions, baseContext({ seatWind: 1, flowers: offSeat }))!;
    expect(offSeatResult.breakdown.map((b) => b.label)).not.toContain("Flowers");
    expect(offSeatResult.fan).toBe(1); // Concealed Hand only
  });

  it("never lets flowers alone satisfy the fan minimum", () => {
    // A hand worth nothing but the automatic Concealed Hand bonus (1 fan),
    // plus two seat-matching bonus tiles (own flower + own season) that
    // would reach the 3-fan minimum if flowers counted toward it -- they
    // must not.
    const decompositions = decomposeHand(twoFanHand(), []);
    const flowers: Tile[] = [
      { id: "f1", suit: "flowers", rank: 1 },
      { id: "f2", suit: "seasons", rank: 1 },
    ];
    const ctx = baseContext({ seatWind: 1, flowers, ruleset: createRuleset(3) });
    const score = bestScore(decompositions, ctx)!;
    // Total fan (capped) clears 3 (1 concealed + 2 capped flowers = 3)...
    expect(score.fan).toBeGreaterThanOrEqual(3);
    // ...but qualifying (non-flower) fan is only 1, so the win must be illegal.
    expect(score.qualifyingFan).toBe(1);
    expect(isValidWinDeclaration(decompositions, ctx)).toBe(false);
  });

  it("does not award fan for a kong itself, but does for a replacement-draw self-draw win", () => {
    const concealed = [
      t("characters", 1),
      t("characters", 2),
      t("characters", 3),
      t("bamboo", 4),
      t("bamboo", 5),
      t("bamboo", 6),
      t("dots", 7),
      t("dots", 8),
      t("dots", 9),
      t("dots", 2),
      t("dots", 2),
    ];
    const kongMeld: Meld = {
      type: "kongExposed",
      tiles: [
        { id: "k1", suit: "winds", rank: 3 },
        { id: "k2", suit: "winds", rank: 3 },
        { id: "k3", suit: "winds", rank: 3 },
        { id: "k4", suit: "winds", rank: 3 },
      ],
    };
    const decompositions = decomposeHand(concealed, [kongMeld]);
    expect(decompositions.length).toBeGreaterThan(0);
    const result = bestScore(
      decompositions,
      baseContext({ selfDraw: true, isReplacementWin: true })
    )!;
    const labels = result.breakdown.map((b) => b.label);
    expect(labels).not.toContain("Kong Bonus");
    expect(labels).toContain("Kong Replacement Win");
  });
});
