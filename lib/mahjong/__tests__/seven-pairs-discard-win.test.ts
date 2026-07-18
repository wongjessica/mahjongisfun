import { describe, expect, it } from "vitest";
import { getLegalActions, mahjongReducer } from "../reducer";
import { createRuleset } from "../scoring/ruleset";
import { GameState, PlayerState, Wind } from "../state";
import { t } from "../fixtures/hands";

function mkPlayer(seat: number, o: Partial<PlayerState> = {}): PlayerState {
  return { seat, seatWind: ((seat%4)+1) as Wind, isBot: false, concealedTiles: [], melds: [], discards: [], flowers: [], score: 0, ...o };
}

describe("seven pairs win off a discard at 5-fan (the ttt.png hand)", () => {
  it("offers DECLARE_WIN when green dragon completes the 7th pair, with a flower for 5 total", () => {
    // Player is East/dealer. 13 tiles = 6 distinct pairs + lone green dragon.
    const hand = [
      t("characters", 1), t("characters", 1),
      t("dots", 2), t("dots", 2),
      t("dots", 3), t("dots", 3),
      t("winds", 3), t("winds", 3),         // West pair
      t("dragons", 1), t("dragons", 1),     // Red pair
      t("dragons", 3), t("dragons", 3),     // White pair
      t("dragons", 2),                      // lone Green -> needs 1 more
    ];
    const greenDiscard = t("dragons", 2);
    const players = [0,1,2,3].map((s)=>mkPlayer(s)) as GameState["players"];
    players[0] = mkPlayer(0, { seatWind: 1, concealedTiles: hand, flowers: [t("flowers", 1)] }); // East owns flower #1
    players[2] = mkPlayer(2, { seatWind: 3, discards: [greenDiscard] });

    const state: GameState = {
      players, wall: { liveTiles: [t("dots",5)], deadWall: [] },
      dealerIndex: 0, roundWind: 1,
      turn: { phase: "awaiting-call-responses", activeSeat: 2 },
      pendingCallWindow: { discardedTile: greenDiscard, discardingSeat: 2, eligibleSeats: [0,1,3], responses: {}, winOnly: false },
      ruleset: createRuleset(5),
      lastDrawWasReplacement: false, winners: null, isDraw: false,
      lastDiscard: { tile: greenDiscard, seat: 2 }, lastDraw: null,
    };

    const legal = getLegalActions(state, 0);
    console.log("seat 0 legal:", legal.map((a)=>a.type).join(","));
    expect(legal.some((a)=>a.type==="DECLARE_WIN")).toBe(true);

    const won = mahjongReducer(state, { type: "DECLARE_WIN", seat: 0 });
    expect(won.turn.phase).toBe("round-ended");
    const w = won.winners![0];
    console.log("fan:", w.fan, "breakdown:", w.breakdown.map(b=>`${b.label}(${b.fan})`).join(" "));
    expect(w.breakdown.map(b=>b.label)).toContain("Seven Pairs");
    expect(w.fan).toBeGreaterThanOrEqual(5);
  });
});
