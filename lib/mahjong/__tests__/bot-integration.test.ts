import { describe, expect, it } from "vitest";
import { intermediateStrategy } from "../bot/intermediateStrategy";
import { createInitialState, getLegalActions, mahjongReducer } from "../reducer";
import { toGameAction } from "../actions";
import { GameState } from "../state";

const TOTAL_TILE_COUNT = 144;

/** Plays a full 4-bot round to completion, purely to exercise the engine +
 * bot pipeline together end-to-end (not a rules-correctness test).
 * `onStep` (if given) runs after every dispatched action, for invariant
 * checks that need to hold at every intermediate state, not just the end. */
function playFullBotRound(seed: number, onStep?: (state: GameState) => void) {
  let state = createInitialState({ fanMinimum: 0, seed });
  const MAX_STEPS = 2000;
  let steps = 0;

  while (state.turn.phase !== "round-ended" && steps < MAX_STEPS) {
    steps++;
    let acted = false;
    for (let seat = 0; seat < 4; seat++) {
      const legal = getLegalActions(state, seat);
      if (legal.length === 0) continue;
      const chosen = intermediateStrategy.chooseAction(state, seat, legal);
      state = mahjongReducer(state, toGameAction(chosen, seat));
      acted = true;
      onStep?.(state);
      break;
    }
    if (!acted) break;
  }

  return { state, steps };
}

describe("bot-vs-bot integration", () => {
  it("plays full rounds to completion across several seeds without errors", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { state, steps } = playFullBotRound(seed);
      expect(steps).toBeLessThan(2000);
      expect(state.turn.phase).toBe("round-ended");
      expect(state.isDraw || (state.winners && state.winners.length > 0)).toBe(true);
    }
  });

  it("conserves all 144 tiles and never lets a hand exceed 14 tiles, at every step", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      playFullBotRound(seed, (state) => {
        for (const player of state.players) {
          expect(player.concealedTiles.length).toBeLessThanOrEqual(14);
        }

        const totalTiles =
          state.players.reduce(
            (sum, p) =>
              sum +
              p.concealedTiles.length +
              p.melds.reduce((s, m) => s + m.tiles.length, 0) +
              p.discards.length +
              p.flowers.length,
            0
          ) +
          state.wall.liveTiles.length +
          state.wall.deadWall.length;
        expect(totalTiles).toBe(TOTAL_TILE_COUNT);
      });
    }
  });
});
