import { describe, expect, it } from "vitest";
import { toGameAction } from "../actions";
import { intermediateStrategy } from "../bot/intermediateStrategy";
import { createInitialState, getLegalActions, mahjongReducer } from "../reducer";
import { GameState } from "../state";
import { RemoteAction, RoundInfo, isActionLegal, replayRound } from "../../multiplayer/protocol";

/** Plays a full bot round directly through the reducer while recording every
 * action as a RemoteAction log -- the exact write pattern online clients
 * produce. */
function playRecordedRound(seed: number): { finalState: GameState; round: RoundInfo; log: RemoteAction[] } {
  const initial = createInitialState({ fanMinimum: 0, seed, humanSeats: [] });
  const round: RoundInfo = { id: 1, initialStateJson: JSON.stringify(initial) };
  const log: RemoteAction[] = [];

  let state = initial;
  let guard = 0;
  while (state.turn.phase !== "round-ended" && guard++ < 2000) {
    let acted = false;
    for (let seat = 0; seat < 4; seat++) {
      const legal = getLegalActions(state, seat);
      if (legal.length === 0) continue;
      const action = toGameAction(intermediateStrategy.chooseAction(state, seat, legal), seat);
      log.push({ roundId: 1, seat, actionJson: JSON.stringify(action) });
      state = mahjongReducer(state, action);
      acted = true;
      break;
    }
    if (!acted) break;
  }

  return { finalState: state, round, log };
}

describe("multiplayer replay", () => {
  it("replaying the action log reproduces the exact final state", () => {
    for (const seed of [11, 222, 3333]) {
      const { finalState, round, log } = playRecordedRound(seed);
      expect(finalState.turn.phase).toBe("round-ended");
      const replayed = replayRound(round, log);
      expect(replayed).toEqual(JSON.parse(JSON.stringify(finalState)));
    }
  });

  it("silently drops illegal, duplicated, and foreign-round actions", () => {
    const { round, log } = playRecordedRound(42);
    const polluted: RemoteAction[] = [];
    for (const entry of log) {
      polluted.push(entry);
      // Duplicate every action (a raced double-append) and inject one from
      // another round -- replay must shrug all of them off.
      polluted.push(entry);
      polluted.push({ ...entry, roundId: 99 });
    }
    const clean = replayRound(round, log);
    const fromPolluted = replayRound(round, polluted);
    expect(fromPolluted).toEqual(clean);
  });

  it("isActionLegal rejects out-of-turn discards", () => {
    const initial = createInitialState({ fanMinimum: 0, seed: 7, humanSeats: [0] });
    // Dealer (seat 0) is awaiting-discard; seat 2 discarding now is illegal.
    const foreignTile = initial.players[2].concealedTiles[0];
    expect(isActionLegal(initial, 2, { type: "DISCARD", tileId: foreignTile.id })).toBe(false);
    const dealerTile = initial.players[0].concealedTiles[0];
    expect(isActionLegal(initial, 0, { type: "DISCARD", tileId: dealerTile.id })).toBe(true);
  });

  it("marks every seat in humanSeats as non-bot", () => {
    const state = createInitialState({ fanMinimum: 0, seed: 1, humanSeats: [0, 2] });
    expect(state.players.map((p) => p.isBot)).toEqual([false, true, false, true]);
  });
});
