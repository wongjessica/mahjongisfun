import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { buildFullSet } from "../tiles";
import { DEAD_WALL_SIZE, buildWall, dealInitialHands } from "../wall";

describe("wall", () => {
  it("builds a full 144-tile set with the correct suit/honor/bonus split", () => {
    const tiles = buildFullSet();
    expect(tiles).toHaveLength(144);
    const suited = tiles.filter((t) => ["dots", "bamboo", "characters"].includes(t.suit));
    const honors = tiles.filter((t) => t.suit === "winds" || t.suit === "dragons");
    const bonus = tiles.filter((t) => t.suit === "flowers" || t.suit === "seasons");
    expect(suited).toHaveLength(108);
    expect(honors).toHaveLength(28);
    expect(bonus).toHaveLength(8);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(144);
  });

  it("splits a shuffled set into a 14-tile dead wall and the remaining live wall", () => {
    const wall = buildWall(createRng(42));
    expect(wall.deadWall).toHaveLength(DEAD_WALL_SIZE);
    expect(wall.liveTiles).toHaveLength(144 - DEAD_WALL_SIZE);
  });

  it("deals 13/13/13/14 tiles with no duplicate ids", () => {
    const wall = buildWall(createRng(7));
    const { hands, wall: remaining } = dealInitialHands(wall, 0);
    expect(hands[0]).toHaveLength(14);
    expect(hands[1]).toHaveLength(13);
    expect(hands[2]).toHaveLength(13);
    expect(hands[3]).toHaveLength(13);

    const allDealt = hands.flat();
    expect(new Set(allDealt.map((t) => t.id)).size).toBe(53);
    expect(remaining.liveTiles).toHaveLength(144 - DEAD_WALL_SIZE - 53);
  });

  it("is deterministic for a fixed seed", () => {
    const dealA = dealInitialHands(buildWall(createRng(123)), 0);
    const dealB = dealInitialHands(buildWall(createRng(123)), 0);
    expect(dealA.hands.map((h) => h.map((t) => t.id))).toEqual(
      dealB.hands.map((h) => h.map((t) => t.id))
    );
  });

  it("produces a different deal for a different seed", () => {
    const dealA = dealInitialHands(buildWall(createRng(1)), 0);
    const dealB = dealInitialHands(buildWall(createRng(2)), 0);
    expect(dealA.hands.map((h) => h.map((t) => t.id))).not.toEqual(
      dealB.hands.map((h) => h.map((t) => t.id))
    );
  });
});
