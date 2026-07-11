import { describe, expect, it } from "vitest";
import { getLegalActions, mahjongReducer } from "../reducer";
import { createRuleset } from "../scoring/ruleset";
import { GameState, PlayerState, Wind } from "../state";
import { t } from "../fixtures/hands";

function makePlayer(seat: number, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    seat,
    seatWind: ((seat % 4) + 1) as Wind,
    isBot: false,
    concealedTiles: [],
    melds: [],
    discards: [],
    flowers: [],
    score: 0,
    ...overrides,
  };
}

function makeTestState(overrides: Partial<GameState> = {}): GameState {
  const players = [0, 1, 2, 3].map((seat) => makePlayer(seat)) as GameState["players"];
  return {
    players,
    wall: { liveTiles: [], deadWall: [] },
    dealerIndex: 0,
    roundWind: 1,
    turn: { phase: "awaiting-draw", activeSeat: 0 },
    pendingCallWindow: null,
    ruleset: createRuleset(0),
    lastDrawWasReplacement: false,
    winners: null,
    isDraw: false,
    lastDiscard: null,
    ...overrides,
  };
}

function withPlayer(state: GameState, seat: number, overrides: Partial<PlayerState>): GameState {
  const players = state.players.slice() as GameState["players"];
  players[seat] = { ...players[seat], ...overrides };
  return { ...state, players };
}

describe("mahjongReducer call priority", () => {
  it("resolves pon over a simultaneous chi request from the next seat", () => {
    const discard = t("characters", 5);
    let state = makeTestState({
      turn: { phase: "awaiting-call-responses", activeSeat: 0 },
      pendingCallWindow: {
        discardedTile: discard,
        discardingSeat: 0,
        eligibleSeats: [1, 3],
        responses: {},
        winOnly: false,
      },
    });
    state = withPlayer(state, 1, { concealedTiles: [t("characters", 4), t("characters", 6)] });
    state = withPlayer(state, 3, { concealedTiles: [t("characters", 5), t("characters", 5)] });

    const chiTileIds: [string, string] = [
      state.players[1].concealedTiles[0].id,
      state.players[1].concealedTiles[1].id,
    ];
    state = mahjongReducer(state, { type: "CALL_CHI", seat: 1, tileIds: chiTileIds });
    state = mahjongReducer(state, { type: "CALL_PON", seat: 3 });

    expect(state.turn.phase).toBe("awaiting-discard");
    expect(state.turn.activeSeat).toBe(3);
    expect(state.players[3].melds).toHaveLength(1);
    expect(state.players[3].melds[0].type).toBe("pon");
    expect(state.players[1].melds).toHaveLength(0);
  });

  it("rejects chi from a seat that is not the discarder's next seat", () => {
    const discard = t("characters", 5);
    let state = makeTestState({
      turn: { phase: "awaiting-call-responses", activeSeat: 0 },
      pendingCallWindow: {
        discardedTile: discard,
        discardingSeat: 0,
        eligibleSeats: [2],
        responses: {},
        winOnly: false,
      },
    });
    // Seat 2 holds tiles that would numerically form a chi, but seat 2 is
    // not seat 0's next player (seat 1 is), so chi must not be offered.
    state = withPlayer(state, 2, { concealedTiles: [t("characters", 4), t("characters", 6)] });

    const legal = getLegalActions(state, 2);
    expect(legal.some((a) => a.type === "CALL_CHI")).toBe(false);
    expect(legal.some((a) => a.type === "PASS")).toBe(true);
  });

  it("recognizes multiple simultaneous winners off the same discard", () => {
    const discard = t("characters", 5);
    const player1Hand = [
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
    const player2Hand = [
      t("dragons", 1),
      t("dragons", 1),
      t("dragons", 1),
      t("winds", 2),
      t("winds", 2),
      t("winds", 2),
      t("dots", 7),
      t("dots", 8),
      t("dots", 9),
      t("bamboo", 3),
      t("bamboo", 3),
      t("characters", 4),
      t("characters", 6),
    ];

    let state = makeTestState({
      turn: { phase: "awaiting-call-responses", activeSeat: 0 },
      pendingCallWindow: {
        discardedTile: discard,
        discardingSeat: 0,
        eligibleSeats: [1, 2],
        responses: {},
        winOnly: false,
      },
    });
    state = withPlayer(state, 1, { concealedTiles: player1Hand });
    state = withPlayer(state, 2, { concealedTiles: player2Hand });

    state = mahjongReducer(state, { type: "DECLARE_WIN", seat: 1 });
    state = mahjongReducer(state, { type: "DECLARE_WIN", seat: 2 });

    expect(state.turn.phase).toBe("round-ended");
    expect(state.winners).toHaveLength(2);
    expect(state.winners!.map((w) => w.seat).sort()).toEqual([1, 2]);
    // The discarder pays both winners.
    expect(state.players[0].score).toBeLessThan(0);
  });
});

describe("mahjongReducer turn loop", () => {
  it("advances a plain draw/discard turn to the next seat when nobody can call", () => {
    let state = makeTestState({
      turn: { phase: "awaiting-draw", activeSeat: 0 },
      wall: { liveTiles: [t("winds", 4), t("winds", 4)], deadWall: [] },
    });
    // Give the active player an otherwise-safe hand and unrelated opponent hands.
    state = withPlayer(state, 0, {
      concealedTiles: [
        t("characters", 1),
        t("characters", 2),
        t("bamboo", 5),
        t("bamboo", 6),
        t("dots", 9),
      ],
    });

    state = mahjongReducer(state, { type: "DRAW" });
    expect(state.turn.phase).toBe("awaiting-discard");

    const discardId = state.players[0].concealedTiles[state.players[0].concealedTiles.length - 1].id;
    state = mahjongReducer(state, { type: "DISCARD", tileId: discardId });

    expect(state.turn.phase).toBe("awaiting-draw");
    expect(state.turn.activeSeat).toBe(1);
    expect(state.players[0].discards).toHaveLength(1);
  });

  it("gates DECLARE_WIN out of the legal-actions list under a 3-fan minimum", () => {
    // A fully concealed hand with no named pattern scores Self-Draw (1) +
    // Concealed Hand (1) = 2 fan for a non-dealer self-draw -- legal to
    // declare at 0-fan minimum, illegal at 3-fan minimum.
    const hand = [
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
      t("dots", 2),
      t("dots", 2),
    ];

    const zeroFanState = withPlayer(
      makeTestState({
        turn: { phase: "awaiting-discard", activeSeat: 0 },
        dealerIndex: 1, // seat 0 must not be dealer, or the Dealer bonus would push this to 3 fan
        ruleset: createRuleset(0),
      }),
      0,
      { concealedTiles: hand }
    );
    expect(getLegalActions(zeroFanState, 0).some((a) => a.type === "DECLARE_WIN")).toBe(true);

    const threeFanState = { ...zeroFanState, ruleset: createRuleset(3) };
    expect(getLegalActions(threeFanState, 0).some((a) => a.type === "DECLARE_WIN")).toBe(false);
  });
});
