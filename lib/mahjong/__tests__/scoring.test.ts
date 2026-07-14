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
    isDealer: false,
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

  it("composes dealer and self-draw bonuses across all four combinations", () => {
    const decompositions = decomposeHand(twoFanHand(), []);
    const combos: [boolean, boolean][] = [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ];
    const fans = combos.map(
      ([isDealer, selfDraw]) => bestScore(decompositions, baseContext({ isDealer, selfDraw }))!.fan
    );
    // baseline Concealed Hand (1) + Self-Draw (1) and/or Dealer (1)
    expect(fans).toEqual([1, 2, 2, 3]);
  });

  it("scales flower bonus fan by count and seat match, up to the flower cap", () => {
    const decompositions = decomposeHand(twoFanHand(), []);
    const flowers: Tile[] = [
      { id: "f1", suit: "flowers", rank: 1 },
      { id: "f2", suit: "flowers", rank: 2 },
    ];
    const result = bestScore(
      decompositions,
      baseContext({ seatWind: 1, flowers })
    )!;
    // Raw flower fan would be 2 flowers * 1 + 1 seat-matching flower * 1 = 3,
    // but flowers are capped at ruleset.flowerFanCap (2). Concealed Hand (1) + 2 = 3.
    expect(result.fan).toBe(1 + 2);
  });

  it("never lets flowers alone satisfy the fan minimum", () => {
    // A hand worth nothing but the automatic Concealed Hand bonus (1 fan),
    // plus enough flowers that their fan would reach the 3-fan minimum if
    // flowers counted toward it -- they must not.
    const decompositions = decomposeHand(twoFanHand(), []);
    const flowers: Tile[] = [
      { id: "f1", suit: "flowers", rank: 1 },
      { id: "f2", suit: "flowers", rank: 2 },
      { id: "f3", suit: "flowers", rank: 3 },
    ];
    const ctx = baseContext({ seatWind: 1, flowers, ruleset: createRuleset(3) });
    const score = bestScore(decompositions, ctx)!;
    // Total fan (capped) easily clears 3 (1 concealed + 2 capped flowers = 3)...
    expect(score.fan).toBeGreaterThanOrEqual(3);
    // ...but qualifying (non-flower) fan is only 1, so the win must be illegal.
    expect(score.qualifyingFan).toBe(1);
    expect(isValidWinDeclaration(decompositions, ctx)).toBe(false);
  });

  it("awards kong bonus fan per kong meld, including a replacement-draw self-draw win", () => {
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
    expect(labels).toContain("Kong Bonus");
    expect(labels).toContain("Kong Replacement Win");
  });
});
