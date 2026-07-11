import { LegalAction } from "../actions";
import { GameState, otherSeats } from "../state";
import { Tile, tileKey } from "../tiles";
import { calculateShanten, calculateStandardShanten } from "./shanten";
import { BotStrategy } from "./strategy";
import { tileSafetyScore } from "./tileSafety";

/** How far below the best safety score a discard candidate can be while
 * still competing for the (slightly randomized) pick -- keeps the bot from
 * being perfectly predictable among near-equal options. */
const SAFETY_MARGIN = 1;

type DiscardAction = Extract<LegalAction, { type: "DISCARD" }>;

function chooseDiscard(state: GameState, seat: number, discardActions: DiscardAction[]): LegalAction {
  const player = state.players[seat];
  const opponents = otherSeats(seat).map((s) => state.players[s]);

  const scored = discardActions.map((action) => {
    const tile = player.concealedTiles.find((t) => t.id === action.tileId) as Tile;
    const remaining = player.concealedTiles.filter((t) => t.id !== action.tileId);
    return {
      action,
      shanten: calculateShanten(remaining, player.melds),
      safety: tileSafetyScore(tile, opponents),
    };
  });

  const minShanten = Math.min(...scored.map((s) => s.shanten));
  const atMinShanten = scored.filter((s) => s.shanten === minShanten);
  const maxSafety = Math.max(...atMinShanten.map((s) => s.safety));
  const candidates = atMinShanten.filter((s) => s.safety >= maxSafety - SAFETY_MARGIN);

  return candidates[Math.floor(Math.random() * candidates.length)].action;
}

/** Predicts the resulting shanten if `seat` takes a chi/pon/kong on the
 * pending discard, without going through the reducer. */
function simulateCallShanten(state: GameState, seat: number, action: LegalAction): number | null {
  const player = state.players[seat];
  const discard = state.pendingCallWindow?.discardedTile;
  if (!discard) return null;

  if (action.type === "CALL_CHI") {
    const remaining = player.concealedTiles.filter((t) => !action.tileIds.includes(t.id));
    return calculateStandardShanten(remaining, player.melds.length + 1);
  }
  if (action.type === "CALL_PON") {
    const matches = player.concealedTiles.filter((t) => tileKey(t) === tileKey(discard)).slice(0, 2);
    const remaining = player.concealedTiles.filter((t) => !matches.includes(t));
    return calculateStandardShanten(remaining, player.melds.length + 1);
  }
  if (action.type === "CALL_KONG_EXPOSED") {
    const matches = player.concealedTiles.filter((t) => tileKey(t) === tileKey(discard)).slice(0, 3);
    const remaining = player.concealedTiles.filter((t) => !matches.includes(t));
    return calculateStandardShanten(remaining, player.melds.length + 1);
  }
  return null;
}

function chooseCallResponse(state: GameState, seat: number, legalActions: LegalAction[]): LegalAction {
  const winAction = legalActions.find((a) => a.type === "DECLARE_WIN");
  if (winAction) return winAction;

  const player = state.players[seat];
  const passShanten = calculateShanten(player.concealedTiles, player.melds);
  let best: { action: LegalAction; shanten: number } = { action: { type: "PASS" }, shanten: passShanten };

  for (const action of legalActions) {
    if (action.type !== "CALL_CHI" && action.type !== "CALL_PON" && action.type !== "CALL_KONG_EXPOSED") {
      continue;
    }
    const shanten = simulateCallShanten(state, seat, action);
    if (shanten !== null && shanten < best.shanten) {
      best = { action, shanten };
    }
  }

  return best.action;
}

/** Heuristic, shanten-driven bot: competent but not a full EV simulator.
 * Always takes a legal win or a free/beneficial kong on its own turn; on
 * discards, keeps whichever tile minimizes shanten and uses tile safety as
 * a tiebreaker; on other players' discards, only calls chi/pon/kong when it
 * doesn't increase shanten versus passing. */
export const intermediateStrategy: BotStrategy = {
  chooseAction(state, seat, legalActions) {
    if (legalActions.length === 1) return legalActions[0];

    if (state.turn.phase === "awaiting-call-responses") {
      return chooseCallResponse(state, seat, legalActions);
    }

    const winAction = legalActions.find((a) => a.type === "DECLARE_WIN");
    if (winAction) return winAction;

    const kongAction = legalActions.find(
      (a) => a.type === "CALL_KONG_CONCEALED" || a.type === "CALL_KONG_ADDED"
    );
    if (kongAction) return kongAction;

    const discardActions = legalActions.filter((a): a is DiscardAction => a.type === "DISCARD");
    return chooseDiscard(state, seat, discardActions);
  },
};
