import { describe, expect, it } from "vitest";
import { analyzePostmortem } from "@/lib/tutorial/postmortem";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";
import { Tile, TileSuit } from "@/lib/mahjong/tiles";

let uid = 0;
const t = (suit: TileSuit, rank: number): Tile => ({ id: `t-${suit}-${rank}-${uid++}`, suit, rank });

/** A finished-round state with a hand-crafted seat-0 hand and empty others. */
function endedWith(seat0Hand: Tile[], overrides: Partial<GameState["players"][number]>[] = []): GameState {
  const base = createInitialState({ fanMinimum: 0, seed: 1, humanSeat: 0, dealerIndex: 0 });
  return {
    ...base,
    roundWind: 1,
    isDraw: true,
    winners: null,
    turn: { phase: "round-ended", activeSeat: 0 },
    players: base.players.map((p, i) => ({
      ...p,
      concealedTiles: i === 0 ? seat0Hand : [],
      melds: [],
      discards: [],
      flowers: [],
      ...(overrides[i] ?? {}),
    })) as GameState["players"],
  };
}

// A hand one tile away from winning: dots234, dots678, red-dragon triplet,
// East pair, and 1-2 bamboo waiting only on a 3 bamboo.
const TENPAI_HAND = [
  t("dots", 2), t("dots", 3), t("dots", 4),
  t("dots", 6), t("dots", 7), t("dots", 8),
  t("dragons", 1), t("dragons", 1), t("dragons", 1),
  t("winds", 1), t("winds", 1),
  t("bamboo", 1), t("bamboo", 2),
];

describe("analyzePostmortem", () => {
  it("finds the exact winning tile and a positive fan value", () => {
    const pm = analyzePostmortem(endedWith(TENPAI_HAND), 0);
    expect(pm.tenpai).toBe(true);
    const bam3 = pm.waits.find((w) => w.tile.suit === "bamboo" && w.tile.rank === 3);
    expect(bam3).toBeDefined();
    // Red Dragon triplet alone is worth fan, so the hand isn't a 0-fan chicken.
    expect(pm.bestFan).toBeGreaterThanOrEqual(1);
    expect(bam3!.patterns.length).toBeGreaterThan(0);
  });

  it("counts a fully-available wait as still live", () => {
    const pm = analyzePostmortem(endedWith(TENPAI_HAND), 0);
    const bam3 = pm.waits.find((w) => w.tile.suit === "bamboo" && w.tile.rank === 3)!;
    expect(bam3.copiesInWall).toBe(4);
    expect(bam3.copiesDiscarded).toBe(0);
    expect(bam3.copiesHeldByOthers).toBe(0);
  });

  it("marks a wait dead when every copy is discarded or held elsewhere", () => {
    // 3 of the 3-bamboo sit in opponents' discards, 1 in an opponent's hand.
    const state = endedWith(TENPAI_HAND, [
      {},
      { discards: [t("bamboo", 3), t("bamboo", 3)] },
      { discards: [t("bamboo", 3)], concealedTiles: [t("bamboo", 3)] },
      {},
    ]);
    const pm = analyzePostmortem(state, 0);
    const bam3 = pm.waits.find((w) => w.tile.suit === "bamboo" && w.tile.rank === 3)!;
    expect(bam3.copiesInWall).toBe(0);
    expect(bam3.copiesDiscarded).toBe(3);
    expect(bam3.copiesHeldByOthers).toBe(1);
  });

  it("reports not-tenpai for a scattered hand", () => {
    const scattered = [
      t("dots", 1), t("dots", 4), t("dots", 7),
      t("bamboo", 2), t("bamboo", 5), t("bamboo", 9),
      t("characters", 1), t("characters", 5), t("characters", 8),
      t("winds", 1), t("winds", 2), t("winds", 3),
      t("dragons", 1),
    ];
    const pm = analyzePostmortem(endedWith(scattered), 0);
    expect(pm.tenpai).toBe(false);
    expect(pm.waits).toHaveLength(0);
  });
});
