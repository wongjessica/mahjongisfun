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

/** What a finished round pays the human at `seat`: everyone gets a small
 * participation payout for seeing a round through, and a win pays out
 * proportionally to how big the hand was. Pure function of the ended
 * state, so the credit (GameBoard) and the display (RoundEndOverlay)
 * can never disagree. */
export function earningsForRound(state: GameState, seat: number): number {
  const PARTICIPATION = 10;
  const win = state.winners?.find((w) => w.seat === seat);
  return PARTICIPATION + (win ? win.fan * 25 : 0);
}
