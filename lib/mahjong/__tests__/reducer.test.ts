import { describe, expect, it } from "vitest";
import { getLegalActions, mahjongReducer, nextRoundTransition } from "../reducer";
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
    lastDraw: null,
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

  it("awards a discard both players can win to the one soonest in turn order (head bump)", () => {
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

    // Seat 2 declares first, but seat 1 sits closer to the discarder (seat 0)
    // in turn order, so priority goes to seat 1 -- and only one player wins.
    state = mahjongReducer(state, { type: "DECLARE_WIN", seat: 2 });
    state = mahjongReducer(state, { type: "DECLARE_WIN", seat: 1 });

    expect(state.turn.phase).toBe("round-ended");
    expect(state.winners).toHaveLength(1);
    expect(state.winners![0].seat).toBe(1);
    // The discarder pays the single winner; seat 2 gets nothing.
    expect(state.players[0].score).toBeLessThan(0);
    expect(state.players[2].score).toBe(0);
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
    // declare at 0-fan minimum, illegal at 3-fan minimum. One set is a
    // triplet (rather than all four being chows) so it doesn't also pick up
    // the All Sequences pattern.
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
      t("characters", 5),
      t("characters", 5),
      t("dots", 2),
      t("dots", 2),
    ];

    const zeroFanState = withPlayer(
      makeTestState({
        turn: { phase: "awaiting-discard", activeSeat: 0 },
        dealerIndex: 1, // seat 0 must not be dealer, or the Dealer bonus would push this to 3 fan
        // Mid-game wall: an empty wall would add the Last Tile bonus fan
        // and defeat the point of a below-minimum hand.
        wall: { liveTiles: [t("dots", 5)], deadWall: [] },
        // The 14th tile was genuinely drawn -- self-turn wins are only
        // legal with a just-drawn tile in hand.
        lastDraw: { tile: hand[13], seat: 0 },
        ruleset: createRuleset(0),
      }),
      0,
      // One off-seat flower: scores nothing itself, but suppresses the No
      // Flowers bonus (which counts toward the minimum and would push this
      // deliberately-cheap hand over the 3-fan bar).
      { concealedTiles: hand, flowers: [{ id: "fx", suit: "flowers", rank: 2 }] }
    );
    expect(getLegalActions(zeroFanState, 0).some((a) => a.type === "DECLARE_WIN")).toBe(true);

    const threeFanState = { ...zeroFanState, ruleset: createRuleset(3) };
    expect(getLegalActions(threeFanState, 0).some((a) => a.type === "DECLARE_WIN")).toBe(false);
  });

  it("forbids declaring a win right after a call (no phantom self-draw), but allows it after a real draw", () => {
    // A complete 14-tile hand in awaiting-discard, but lastDraw is null --
    // exactly the state a pon/chi leaves behind (calls clear lastDraw).
    const hand = [
      t("characters", 1), t("characters", 2), t("characters", 3),
      t("bamboo", 4), t("bamboo", 5), t("bamboo", 6),
      t("dots", 7), t("dots", 8), t("dots", 9),
      t("characters", 5), t("characters", 5), t("characters", 5),
      t("dots", 2), t("dots", 2),
    ];
    const base = withPlayer(
      makeTestState({
        turn: { phase: "awaiting-discard", activeSeat: 0 },
        dealerIndex: 1,
        ruleset: createRuleset(0),
      }),
      0,
      { concealedTiles: hand }
    );
    // Mark the round as no longer fresh (a discard exists elsewhere), so
    // the heavenly-hand exception can't apply either.
    const postCall = withPlayer(base, 2, { discards: [t("winds", 1)] });
    expect(getLegalActions(postCall, 0).some((a) => a.type === "DECLARE_WIN")).toBe(false);
    // The reducer itself must also refuse a forced dispatch.
    expect(mahjongReducer(postCall, { type: "DECLARE_WIN", seat: 0 }).turn.phase).toBe("awaiting-discard");

    const afterDraw = { ...postCall, lastDraw: { tile: hand[13], seat: 0 } };
    expect(getLegalActions(afterDraw, 0).some((a) => a.type === "DECLARE_WIN")).toBe(true);

    // Heavenly hand: the dealer's very first action of an untouched round.
    const heavenly = withPlayer(
      makeTestState({
        turn: { phase: "awaiting-discard", activeSeat: 0 },
        dealerIndex: 0,
        ruleset: createRuleset(0),
      }),
      0,
      { concealedTiles: hand }
    );
    expect(getLegalActions(heavenly, 0).some((a) => a.type === "DECLARE_WIN")).toBe(true);
  });

  it("stores chi melds in rank order regardless of which tile was called", () => {
    const discard = t("characters", 3);
    const low = t("characters", 4);
    const high = t("characters", 5);
    const state = withPlayer(
      makeTestState({
        turn: { phase: "awaiting-call-responses", activeSeat: 0 },
        pendingCallWindow: {
          discardedTile: discard,
          discardingSeat: 0,
          eligibleSeats: [1],
          responses: {},
          winOnly: false,
        },
      }),
      1,
      { concealedTiles: [high, low, t("dots", 9), t("winds", 2)] }
    );
    const next = mahjongReducer(state, { type: "CALL_CHI", seat: 1, tileIds: [high.id, low.id] });
    const meld = next.players[1].melds[0];
    expect(meld.type).toBe("chi");
    expect(meld.tiles.map((tile) => tile.rank)).toEqual([3, 4, 5]);
  });

  it("advances the table wind only after every seat has been dealer", () => {
    const win = (seat: number) =>
      [{ seat, decomposition: { kind: "standard", concealedGroups: [], melds: [] }, fan: 3, selfDraw: false, wonTile: t("dots", 1), fromSeat: null, breakdown: [], revealedHand: { concealedTiles: [], melds: [] } }] as GameState["winners"];

    // Dealer wins -> dealer repeats, wind unchanged.
    const dealerWon = makeTestState({ dealerIndex: 2, roundWind: 1, winners: win(2) });
    expect(nextRoundTransition(dealerWon)).toEqual({ dealerIndex: 2, roundWind: 1 });

    // Draw -> dealer repeats, wind unchanged.
    const drawn = makeTestState({ dealerIndex: 3, roundWind: 1, isDraw: true });
    expect(nextRoundTransition(drawn)).toEqual({ dealerIndex: 3, roundWind: 1 });

    // Non-dealer wins mid-cycle -> dealership passes, wind unchanged.
    const midCycle = makeTestState({ dealerIndex: 1, roundWind: 2, winners: win(3) });
    expect(nextRoundTransition(midCycle)).toEqual({ dealerIndex: 2, roundWind: 2 });

    // Non-dealer wins while seat 3 deals -> cycle complete, wind advances.
    const cycleEnd = makeTestState({ dealerIndex: 3, roundWind: 1, winners: win(0) });
    expect(nextRoundTransition(cycleEnd)).toEqual({ dealerIndex: 0, roundWind: 2 });

    // North round wraps back to East.
    const northEnd = makeTestState({ dealerIndex: 3, roundWind: 4, winners: win(1) });
    expect(nextRoundTransition(northEnd)).toEqual({ dealerIndex: 0, roundWind: 1 });
  });
});
