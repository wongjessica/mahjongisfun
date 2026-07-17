import { GameState } from "./mahjong/state";

/** Play-money wallets, persisted per device. Solo and online play earn
 * into SEPARATE balances (they're different games of skill: bots vs
 * people), which is also what makes the split visible and fun to compare. */
export type WalletKind = "solo" | "online";

const KEYS: Record<WalletKind, string> = {
  solo: "mahjong-wallet-solo",
  online: "mahjong-wallet-online",
};

export function getBalance(kind: WalletKind): number {
  try {
    const raw = localStorage.getItem(KEYS[kind]);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function addEarnings(kind: WalletKind, amount: number): number {
  const next = getBalance(kind) + amount;
  try {
    localStorage.setItem(KEYS[kind], String(next));
  } catch {
    // Storage full/blocked -- the game must keep working regardless.
  }
  return next;
}

/** Dollars per fan -- a 5-fan hand moves $50 per paying player. */
const DOLLARS_PER_FAN = 10;

/** What a finished round actually moves for the player at `seat`, per the
 * traditional HK settlement (this deliberately mirrors the engine's own
 * score settlement, at $10 per fan):
 *
 *   - Self-draw: EVERYONE pays the winner (fan x $10 each, so the winner
 *     collects 3x that).
 *   - Win off a discard: only the seat that fed the winning tile pays.
 *   - Nobody else gains or loses a cent -- and yes, balances go negative.
 *
 * Pure function of the ended state, so the credit (GameBoard) and the
 * display (RoundEndOverlay) can never disagree. */
export function earningsForRound(state: GameState, seat: number): number {
  let fanDelta = 0;
  for (const win of state.winners ?? []) {
    if (win.seat === seat) {
      fanDelta += win.selfDraw ? win.fan * 3 : win.fan;
    } else if (win.selfDraw) {
      fanDelta -= win.fan;
    } else if (win.fromSeat === seat) {
      fanDelta -= win.fan;
    }
  }
  return fanDelta * DOLLARS_PER_FAN;
}
