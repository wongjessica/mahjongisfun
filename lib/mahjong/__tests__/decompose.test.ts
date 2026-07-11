import { describe, expect, it } from "vitest";
import { decomposeHand } from "../decompose";
import {
  allTripletsHand,
  ambiguousDecompositionHand,
  fullFlushHand,
  halfFlushHand,
  nonWinningHand,
  sevenPairsHand,
  thirteenOrphansHand,
} from "../fixtures/hands";

describe("decomposeHand", () => {
  it("finds the standard decomposition for a full flush hand", () => {
    const results = decomposeHand(fullFlushHand(), []);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.kind === "standard")).toBe(true);
  });

  it("finds the standard decomposition for a half flush hand", () => {
    const results = decomposeHand(halfFlushHand(), []);
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds the standard decomposition for an all-triplets hand", () => {
    const results = decomposeHand(allTripletsHand(), []);
    expect(results.length).toBeGreaterThan(0);
    const withFourTriplets = results.find(
      (r) => r.concealedGroups.filter((g) => g.kind === "triplet").length === 4
    );
    expect(withFourTriplets).toBeDefined();
  });

  it("recognizes seven pairs via the dedicated path, not the standard search", () => {
    const results = decomposeHand(sevenPairsHand(), []);
    const sevenPairsResult = results.find((r) => r.kind === "sevenPairs");
    expect(sevenPairsResult).toBeDefined();
    expect(sevenPairsResult!.concealedGroups).toHaveLength(7);
    expect(sevenPairsResult!.concealedGroups.every((g) => g.kind === "pair")).toBe(true);
  });

  it("does not misclassify an exposed-pon hand as seven pairs", () => {
    // Same 14-tile multiset shape as allTripletsHand, but with one triplet
    // already declared as an exposed pon meld -- seven pairs requires a
    // fully concealed hand, so it must not appear even if tile counts allow it.
    const concealed = allTripletsHand().slice(0, 11); // drop one full triplet's worth
    const meld = {
      type: "pon" as const,
      tiles: [
        { id: "x1", suit: "dots" as const, rank: 9 },
        { id: "x2", suit: "dots" as const, rank: 9 },
        { id: "x3", suit: "dots" as const, rank: 9 },
      ],
    };
    const results = decomposeHand(concealed, [meld]);
    expect(results.some((r) => r.kind === "sevenPairs")).toBe(false);
  });

  it("recognizes thirteen orphans via the dedicated path", () => {
    const results = decomposeHand(thirteenOrphansHand(), []);
    const orphansResult = results.find((r) => r.kind === "thirteenOrphans");
    expect(orphansResult).toBeDefined();
  });

  it("enumerates multiple valid decompositions for an ambiguous hand", () => {
    const results = decomposeHand(ambiguousDecompositionHand(), []);
    expect(results.length).toBeGreaterThanOrEqual(2);
    const tripletReading = results.find(
      (r) => r.concealedGroups.filter((g) => g.kind === "triplet").length === 4
    );
    const sequenceReading = results.find(
      (r) => r.concealedGroups.filter((g) => g.kind === "sequence").length === 3
    );
    expect(tripletReading).toBeDefined();
    expect(sequenceReading).toBeDefined();
  });

  it("returns no decompositions for a non-winning hand", () => {
    const results = decomposeHand(nonWinningHand(), []);
    expect(results).toHaveLength(0);
  });
});
