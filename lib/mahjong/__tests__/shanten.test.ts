import { describe, expect, it } from "vitest";
import { calculateShanten, calculateStandardShanten, sevenPairsShanten } from "../bot/shanten";
import { fullFlushHand, t } from "../fixtures/hands";

describe("calculateStandardShanten", () => {
  it("scores a complete 14-tile standard hand at -1 (already won)", () => {
    expect(calculateStandardShanten(fullFlushHand(), 0)).toBe(-1);
  });

  it("scores a 13-tile tenpai hand (single kanchan wait) at 0", () => {
    const hand = [
      t("characters", 1),
      t("characters", 1),
      t("characters", 1),
      t("characters", 7),
      t("characters", 8),
      t("characters", 9),
      t("dots", 3),
      t("dots", 3),
      t("bamboo", 5),
      t("bamboo", 5),
      t("bamboo", 5),
      t("characters", 4),
      t("characters", 6),
    ];
    expect(calculateStandardShanten(hand, 0)).toBe(0);
  });

  it("scores a maximally scattered 13-tile hand (no pairs, no partial runs) at 8", () => {
    // Every same-suit gap is >= 3 (so no kanchan/ryanmen partials), and no
    // tile type repeats (so no pair either) -- zero usable blocks.
    const hand = [
      t("characters", 1),
      t("characters", 4),
      t("characters", 7),
      t("bamboo", 2),
      t("bamboo", 5),
      t("bamboo", 8),
      t("dots", 3),
      t("dots", 6),
      t("dots", 9),
      t("winds", 1),
      t("winds", 2),
      t("winds", 3),
      t("dragons", 1),
    ];
    expect(calculateStandardShanten(hand, 0)).toBe(8);
  });

  it("accounts for locked melds when computing sets needed", () => {
    // 3 sets + pair already concealed-complete (11 tiles), with 1 meld
    // already locked in -- this hand is a complete 4-sets+pair hand.
    const hand = [
      t("characters", 1),
      t("characters", 1),
      t("characters", 1),
      t("bamboo", 5),
      t("bamboo", 5),
      t("bamboo", 5),
      t("dots", 7),
      t("dots", 8),
      t("dots", 9),
      t("winds", 2),
      t("winds", 2),
    ];
    expect(calculateStandardShanten(hand, 1)).toBe(-1);
  });
});

describe("sevenPairsShanten", () => {
  it("scores a 13-tile six-pairs-plus-single hand at 0 (tenpai)", () => {
    const hand = [
      t("characters", 1),
      t("characters", 1),
      t("bamboo", 2),
      t("bamboo", 2),
      t("dots", 3),
      t("dots", 3),
      t("winds", 1),
      t("winds", 1),
      t("winds", 2),
      t("winds", 2),
      t("dragons", 1),
      t("dragons", 1),
      t("dragons", 2),
    ];
    expect(sevenPairsShanten(hand)).toBe(0);
  });
});

describe("calculateShanten", () => {
  it("takes the better of standard and seven-pairs shanten when unmelded", () => {
    const sixPairsHand = [
      t("characters", 1),
      t("characters", 1),
      t("bamboo", 2),
      t("bamboo", 2),
      t("dots", 3),
      t("dots", 3),
      t("winds", 1),
      t("winds", 1),
      t("winds", 2),
      t("winds", 2),
      t("dragons", 1),
      t("dragons", 1),
      t("dragons", 2),
    ];
    expect(calculateShanten(sixPairsHand, [])).toBe(0);
  });
});
