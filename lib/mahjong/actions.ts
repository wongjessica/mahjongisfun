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
