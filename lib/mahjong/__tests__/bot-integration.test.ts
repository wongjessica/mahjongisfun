import { describe, expect, it } from "vitest";
import { intermediateStrategy } from "../bot/intermediateStrategy";
import { createInitialState, getLegalActions, mahjongReducer } from "../reducer";
import { GameAction } from "../actions";

function legalActionToGameAction(action: ReturnType<typeof getLegalActions>[number], seat: number): GameAction {
  switch (action.type) {
    case "DRAW":
      return { type: "DRAW" };
    case "DISCARD":
      return { type: "DISCARD", tileId: action.tileId };
    case "REPLACE_FLOWER":
      return { type: "REPLACE_FLOWER" };
    case "CALL_CHI":
      return { type: "CALL_CHI", seat, tileIds: action.tileIds };
    case "CALL_PON":
      return { type: "CALL_PON", seat };
    case "CALL_KONG_EXPOSED":
      return { type: "CALL_KONG_EXPOSED", seat };
    case "CALL_KONG_CONCEALED":
      return { type: "CALL_KONG_CONCEALED", seat, tileKey: action.tileKey };
    case "CALL_KONG_ADDED":
      return { type: "CALL_KONG_ADDED", seat, tileId: action.tileId };
    case "DECLARE_WIN":
      return { type: "DECLARE_WIN", seat };
    case "PASS":
      return { type: "PASS", seat };
  }
}

/** Plays a full 4-bot round to completion, purely to exercise the engine +
 * bot pipeline together end-to-end (not a rules-correctness test). */
function playFullBotRound(seed: number) {
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
      state = mahjongReducer(state, legalActionToGameAction(chosen, seat));
      acted = true;
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
});
