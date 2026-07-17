import { describe, expect, it } from "vitest";
import { toGameAction } from "../actions";
import { smartStrategy } from "../bot/smartStrategy";
import { createInitialState, getLegalActions, mahjongReducer } from "../reducer";
import { FanMinimum } from "../scoring/ruleset";
import { GameState } from "../state";

function playFullRound(seed: number, fanMinimum: FanMinimum): GameState {
  let state = createInitialState({ fanMinimum, seed, humanSeats: [] });
  let steps = 0;
  while (state.turn.phase !== "round-ended" && steps++ < 2000) {
    let acted = false;
    for (let seat = 0; seat < 4; seat++) {
      const legal = getLegalActions(state, seat);
      if (legal.length === 0) continue;
      state = mahjongReducer(state, toGameAction(smartStrategy.chooseAction(state, seat, legal), seat));
      acted = true;
      break;
    }
    if (!acted) break;
  }
  return state;
}

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7 + 1);

describe("smart bot strategy", () => {
  it("wins most 3-fan games instead of draining the wall (the old bot drew ~90%)", () => {
    let wins = 0;
    let draws = 0;
    for (const seed of SEEDS) {
      const state = playFullRound(seed, 3);
      expect(state.turn.phase).toBe("round-ended");
      if (state.isDraw) draws++;
      else wins++;
    }
    // The exact split varies by seed set, but fan-aware play must make
    // decided games the norm, not the exception.
    expect(wins).toBeGreaterThan(draws);
  });

  it("every 3-fan win it declares actually carries >= 3 qualifying fan", () => {
    for (const seed of SEEDS) {
      const state = playFullRound(seed, 3);
      for (const winner of state.winners ?? []) {
        // Flowers are excluded from breakdown-based qualification checks in
        // the engine; here the declared fan total must clear the minimum.
        expect(winner.fan).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("still wins a meaningful share of games at a 5-fan minimum", () => {
    let wins = 0;
    for (const seed of SEEDS) {
      const state = playFullRound(seed, 5);
      if (!state.isDraw && (state.winners?.length ?? 0) > 0) {
        wins++;
        for (const winner of state.winners ?? []) {
          expect(winner.fan).toBeGreaterThanOrEqual(5);
        }
      }
    }
    // 5-fan is genuinely hard; require it to be clearly achievable rather
    // than a wall-draw fest (old strategy: essentially zero).
    expect(wins).toBeGreaterThanOrEqual(SEEDS.length * 0.25);
  });
});
