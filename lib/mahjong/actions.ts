export type GameAction =
  | { type: "DRAW" }
  | { type: "DISCARD"; tileId: string }
  | { type: "REPLACE_FLOWER" }
  | { type: "CALL_CHI"; seat: number; tileIds: [string, string] }
  | { type: "CALL_PON"; seat: number }
  | { type: "CALL_KONG_EXPOSED"; seat: number }
  | { type: "CALL_KONG_CONCEALED"; seat: number; tileKey: string }
  | { type: "CALL_KONG_ADDED"; seat: number; tileId: string }
  | { type: "DECLARE_WIN"; seat: number }
  | { type: "PASS"; seat: number };

export type LegalAction =
  | { type: "DRAW" }
  | { type: "DISCARD"; tileId: string }
  | { type: "REPLACE_FLOWER" }
  | { type: "CALL_CHI"; tileIds: [string, string] }
  | { type: "CALL_PON" }
  | { type: "CALL_KONG_EXPOSED" }
  | { type: "CALL_KONG_CONCEALED"; tileKey: string }
  | { type: "CALL_KONG_ADDED"; tileId: string }
  | { type: "DECLARE_WIN" }
  | { type: "PASS" };

/** Converts a selector-produced LegalAction (no seat) into the dispatchable
 * GameAction for a given seat -- the single place callers (UI, bots, tests)
 * do this so the two action shapes can't drift apart. */
export function toGameAction(action: LegalAction, seat: number): GameAction {
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
