import { describe, expect, it } from "vitest";
import { decomposeHand } from "../decompose";
import { bestScore, isValidWinDeclaration } from "../scoring/calculate";
import { ScoringContext } from "../scoring/fan-table";
import { createRuleset } from "../scoring/ruleset";
import {
  allSequencesHand,
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
    isLastTile: false,
    winningTileKey: null,
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

  it("scores an all-chows hand (two overlapping same-suit runs) with All Sequences", () => {
    const decompositions = decomposeHand(allSequencesHand(), []);
    const result = bestScore(decompositions, baseContext())!;
    expect(result.breakdown.map((b) => b.label)).toContain("All Sequences");
    expect(result.fan).toBeGreaterThanOrEqual(1);
  });

  it("does not award All Sequences when the pair is the seat or round wind", () => {
    const decompositions = decomposeHand(allSequencesHand(), []);
    // allSequencesHand's pair is North Wind (rank 4).
    const bySeat = bestScore(decompositions, baseContext({ seatWind: 4 }))!;
    expect(bySeat.breakdown.map((b) => b.label)).not.toContain("All Sequences");

    const byRound = bestScore(decompositions, baseContext({ roundWind: 4 }))!;
    expect(byRound.breakdown.map((b) => b.label)).not.toContain("All Sequences");
  });

  it("reproduces the reported hand: half flush + flower + all sequences = 5 fan", () => {
    // Exposed chows 2-3-4 and 6-7-8 bamboo, concealed 1-2-3 and 7-8-9
    // bamboo, South Wind pair, plus one seat-matching flower.
    const concealed = [
      t("bamboo", 1),
      t("bamboo", 2),
      t("bamboo", 3),
      t("bamboo", 7),
      t("bamboo", 8),
      t("bamboo", 9),
      t("winds", 2),
      t("winds", 2),
    ];
    const melds: Meld[] = [
      { type: "chi", tiles: [t("bamboo", 2), t("bamboo", 3), t("bamboo", 4)] },
      { type: "chi", tiles: [t("bamboo", 6), t("bamboo", 7), t("bamboo", 8)] },
    ];
    const decompositions = decomposeHand(concealed, melds);
    // Winner is dealer (East seat, East round) -- the South Wind pair is
    // neither, so it stays an unvalued pair and All Sequences applies.
    const flowers: Tile[] = [{ id: "f1", suit: "flowers", rank: 1 }];
    const result = bestScore(decompositions, baseContext({ seatWind: 1, roundWind: 1, flowers }))!;
    const labels = result.breakdown.map((b) => b.label);
    expect(labels).toContain("Half Flush");
    expect(labels).toContain("All Sequences");
    expect(labels).toContain("Flowers");
    expect(result.fan).toBe(5);
  });

  it("does not award All Sequences when the pair is a dragon", () => {
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
      t("characters", 5),
      t("characters", 6),
      t("characters", 7),
      t("dragons", 1),
      t("dragons", 1),
    ];
    const decompositions = decomposeHand(concealed, []);
    const result = bestScore(decompositions, baseContext())!;
    expect(result.breakdown.map((b) => b.label)).not.toContain("All Sequences");
  });

  it("scores seven pairs at a fixed fan value", () => {
    const decompositions = decomposeHand(sevenPairsHand(), []);
    const result = bestScore(decompositions, baseContext())!;
    expect(result.breakdown.map((b) => b.label)).toContain("Seven Pairs");
  });

  it("scores All Terminals at the limit and Terminals & Honors at 8", () => {
    const allTerminals = [
      t("characters", 1), t("characters", 1), t("characters", 1),
      t("characters", 9), t("characters", 9), t("characters", 9),
      t("dots", 1), t("dots", 1), t("dots", 1),
      t("bamboo", 9), t("bamboo", 9), t("bamboo", 9),
      t("dots", 9), t("dots", 9),
    ];
    const ruleset = createRuleset(0);
    const pure = bestScore(decomposeHand(allTerminals, []), baseContext({ ruleset }))!;
    expect(pure.breakdown.map((b) => b.label)).toContain("All Terminals");
    expect(pure.fan).toBe(ruleset.limitFan);

    const mixed = [
      t("characters", 1), t("characters", 1), t("characters", 1),
      t("dots", 9), t("dots", 9), t("dots", 9),
      t("winds", 1), t("winds", 1), t("winds", 1),
      t("dragons", 2), t("dragons", 2), t("dragons", 2),
      t("bamboo", 1), t("bamboo", 1),
    ];
    const mixedResult = bestScore(decomposeHand(mixed, []), baseContext({ ruleset }))!;
    const labels = mixedResult.breakdown.map((b) => b.label);
    expect(labels).toContain("Terminals & Honors");
    expect(labels).not.toContain("All Terminals");

    // A hand with a 1-2-3 sequence is NOT a terminal hand.
    const withSequence = [
      t("characters", 1), t("characters", 2), t("characters", 3),
      t("characters", 9), t("characters", 9), t("characters", 9),
      t("dots", 1), t("dots", 1), t("dots", 1),
      t("bamboo", 9), t("bamboo", 9), t("bamboo", 9),
      t("dots", 9), t("dots", 9),
    ];
    const seqResult = bestScore(decomposeHand(withSequence, []), baseContext({ ruleset }))!;
    const seqLabels = seqResult.breakdown.map((b) => b.label);
    expect(seqLabels).not.toContain("All Terminals");
    expect(seqLabels).not.toContain("Terminals & Honors");
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
    // Concealed Hand (1) + No Flowers (1) -- both count toward the minimum.
    expect(score.qualifyingFan).toBe(2);
    expect(score.fan).toBe(2);

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
    // baseline Concealed Hand (1) + No Flowers (1), +1 more when self-draw
    expect(fans).toEqual([2, 3]);
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

  it("counts your own flowers toward the fan minimum (house rule)", () => {
    // Concealed Hand (1) + two seat-matching bonus tiles (own flower + own
    // season, 2) = 3 -- flowers definitely count toward the minimum, so
    // this clears a 3-fan table.
    const decompositions = decomposeHand(twoFanHand(), []);
    const flowers: Tile[] = [
      { id: "f1", suit: "flowers", rank: 1 },
      { id: "f2", suit: "seasons", rank: 1 },
    ];
    const ctx = baseContext({ seatWind: 1, flowers, ruleset: createRuleset(3) });
    const score = bestScore(decompositions, ctx)!;
    expect(score.qualifyingFan).toBe(3);
    expect(isValidWinDeclaration(decompositions, ctx)).toBe(true);

    // An off-seat flower scores nothing, so the same hand stays below 3.
    const offSeatCtx = baseContext({
      seatWind: 1,
      flowers: [{ id: "f3", suit: "flowers", rank: 2 }],
      ruleset: createRuleset(3),
    });
    expect(isValidWinDeclaration(decompositions, offSeatCtx)).toBe(false);
  });

  it("awards a bonus fan for winning with no flowers at all", () => {
    const decompositions = decomposeHand(twoFanHand(), []);
    // baseContext has flowers: [] -- the bare-handed case.
    const bare = bestScore(decompositions, baseContext())!;
    expect(bare.breakdown.map((b) => b.label)).toContain("No Flowers");
    // Counts toward the minimum like any other fan.
    expect(bare.qualifyingFan).toBe(bare.fan);

    // Any flower at all (even an off-seat one worth nothing) kills it.
    const withFlower = bestScore(
      decompositions,
      baseContext({ seatWind: 1, flowers: [{ id: "f", suit: "flowers", rank: 2 }] })
    )!;
    expect(withFlower.breakdown.map((b) => b.label)).not.toContain("No Flowers");
  });

  it("scores Kan Kan Wo at exactly 10 for concealed self-drawn all-triplets", () => {
    // Deliberately neutral triplets (three suits, no honors) so no flush /
    // dragon / wind fan muddies the "exactly 10" arithmetic.
    const hand = [
      t("characters", 1), t("characters", 1), t("characters", 1),
      t("bamboo", 5), t("bamboo", 5), t("bamboo", 5),
      t("dots", 3), t("dots", 3), t("dots", 3),
      t("characters", 7), t("characters", 7), t("characters", 7),
      t("dots", 9), t("dots", 9),
    ];
    const decompositions = decomposeHand(hand, []);
    // Self-draw: Kan Kan Wo (8) + Self-Draw (1) + Concealed Hand (1) = 10.
    // Give the context one off-seat flower so the No Flowers bonus doesn't
    // muddy the arithmetic.
    const flowers = [{ id: "f", suit: "flowers" as const, rank: 3 }];
    const selfDrawn = bestScore(decompositions, baseContext({ selfDraw: true, flowers }))!;
    expect(selfDrawn.breakdown.map((b) => b.label)).toContain("Kan Kan Wo");
    expect(selfDrawn.breakdown.map((b) => b.label)).not.toContain("All Triplets");
    expect(selfDrawn.fan).toBe(10);

    // Discard completing the PAIR (9 Dots): Kan Kan Wo (9) + Concealed (1) = 10.
    const pairWin = bestScore(
      decompositions,
      baseContext({ selfDraw: false, winningTileKey: "dots-9", flowers })
    )!;
    expect(pairWin.breakdown.map((b) => b.label)).toContain("Kan Kan Wo");
    expect(pairWin.fan).toBe(10);

    // Discard completing a TRIPLET is NOT Kan Kan Wo -- that triplet
    // wasn't self-drawn. Falls back to plain All Triplets.
    const tripletWin = bestScore(
      decompositions,
      baseContext({ selfDraw: false, winningTileKey: "bamboo-5", flowers })
    )!;
    expect(tripletWin.breakdown.map((b) => b.label)).toContain("All Triplets");
    expect(tripletWin.breakdown.map((b) => b.label)).not.toContain("Kan Kan Wo");

    // An exposed pon anywhere also disqualifies it.
    const ponMeld: Meld = {
      type: "pon",
      tiles: [
        { id: "p1", suit: "dots", rank: 5 },
        { id: "p2", suit: "dots", rank: 5 },
        { id: "p3", suit: "dots", rank: 5 },
      ],
    };
    const exposedHand = [
      t("characters", 1), t("characters", 1), t("characters", 1),
      t("bamboo", 5), t("bamboo", 5), t("bamboo", 5),
      t("dragons", 1), t("dragons", 1), t("dragons", 1),
      t("dots", 9), t("dots", 9),
    ];
    const exposed = bestScore(decomposeHand(exposedHand, [ponMeld]), baseContext({ selfDraw: true, flowers }))!;
    expect(exposed.breakdown.map((b) => b.label)).toContain("All Triplets");
    expect(exposed.breakdown.map((b) => b.label)).not.toContain("Kan Kan Wo");
  });

  it("awards one bonus fan for a last-tile win", () => {
    const decompositions = decomposeHand(twoFanHand(), []);
    const normal = bestScore(decompositions, baseContext())!;
    const lastTile = bestScore(decompositions, baseContext({ isLastTile: true }))!;
    expect(lastTile.breakdown.map((b) => b.label)).toContain("Last Tile");
    expect(lastTile.fan).toBe(normal.fan + 1);
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
