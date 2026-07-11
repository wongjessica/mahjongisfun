import { Meld } from "./melds";
import { Tile } from "./tiles";
import { Wall } from "./wall";
import { Ruleset } from "./scoring/ruleset";
import { Decomposition } from "./decompose";

export type Wind = 1 | 2 | 3 | 4; // 1=East 2=South 3=West 4=North

export type TurnPhase =
  | "awaiting-draw"
  | "awaiting-discard"
  | "awaiting-call-responses"
  | "awaiting-flower-replacement"
  | "round-ended";

export interface PlayerState {
  seat: number;
  seatWind: Wind;
  isBot: boolean;
  concealedTiles: Tile[];
  melds: Meld[];
  discards: Tile[];
  flowers: Tile[];
  score: number;
}

export type CallResponseType = "pass" | "chi" | "pon" | "kong" | "win";

export interface CallResponse {
  type: CallResponseType;
  /** For chi: the two concealed tile ids used to complete the sequence. */
  chiTileIds?: [string, string];
}

export interface PendingCallWindow {
  discardedTile: Tile;
  /** The seat whose action opened this window -- a real discarder, or (when
   * winOnly is true) the seat that just declared an added kong. */
  discardingSeat: number;
  /** Seats still eligible to respond (not yet passed or preempted). */
  eligibleSeats: number[];
  responses: Partial<Record<number, CallResponse>>;
  /** True for a "robbing the kong" window: only DECLARE_WIN/PASS are legal,
   * no chi/pon/kong may be called on an added-kong tile. */
  winOnly: boolean;
}

export interface WinResult {
  seat: number;
  decomposition: Decomposition;
  fan: number;
  selfDraw: boolean;
  wonTile: Tile;
  fromSeat: number | null;
  breakdown: { label: string; fan: number }[];
}

export interface GameState {
  players: [PlayerState, PlayerState, PlayerState, PlayerState];
  wall: Wall;
  dealerIndex: number;
  roundWind: Wind;
  turn: {
    phase: TurnPhase;
    activeSeat: number;
  };
  pendingCallWindow: PendingCallWindow | null;
  ruleset: Ruleset;
  lastDrawWasReplacement: boolean;
  winners: WinResult[] | null;
  isDraw: boolean;
  /** Most recent discard across all seats, purely for UI display (e.g. a
   * center-of-table callout) -- not read by any rules logic. */
  lastDiscard: { tile: Tile; seat: number } | null;
}

export function otherSeats(seat: number): number[] {
  return [0, 1, 2, 3].filter((s) => s !== seat);
}

export function nextSeat(seat: number): number {
  return (seat + 1) % 4;
}
