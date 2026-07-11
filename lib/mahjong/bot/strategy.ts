import { LegalAction } from "../actions";
import { GameState } from "../state";

export interface BotStrategy {
  /** Picks one action from the (non-empty) list of actions the engine
   * considers legal for `seat` right now. Implementations never need to
   * re-derive legality -- getLegalActions is the single source of truth. */
  chooseAction(state: GameState, seat: number, legalActions: LegalAction[]): LegalAction;
}
