import { GameState } from "@/lib/mahjong/state";
import { earningsForRound } from "@/lib/wallet";

export interface PlayerStats {
  handsPlayed: number;
  wins: number;
  selfDraws: number;
  /** Highest fan the player has ever won with. */
  biggestFan: number;
  /** The " · "-joined pattern breakdown of that biggest hand. */
  biggestHand: string;
  /** How many times each winning pattern (Half Flush, Seven Pairs, ...) has
   * appeared in the player's wins -- drives "favorite winning pattern". */
  patterns: Record<string, number>;
}

export interface Wallet {
  solo: number;
  online: number;
}

export interface Profile {
  wallet: Wallet;
  stats: PlayerStats;
  /** uid -> display name of people this player has played online with. */
  friends: Record<string, string>;
}

export const EMPTY_STATS: PlayerStats = {
  handsPlayed: 0,
  wins: 0,
  selfDraws: 0,
  biggestFan: 0,
  biggestHand: "",
  patterns: {},
};

export const EMPTY_PROFILE: Profile = {
  wallet: { solo: 0, online: 0 },
  stats: EMPTY_STATS,
  friends: {},
};

/** Fills in any missing fields on a profile read from the cloud (older
 * records, RTDB dropping empty objects) so the rest of the app can treat
 * it as complete. */
export function normalizeProfile(raw: Partial<Profile> | null | undefined): Profile {
  return {
    wallet: {
      solo: Number(raw?.wallet?.solo ?? 0) || 0,
      online: Number(raw?.wallet?.online ?? 0) || 0,
    },
    stats: {
      handsPlayed: Number(raw?.stats?.handsPlayed ?? 0) || 0,
      wins: Number(raw?.stats?.wins ?? 0) || 0,
      selfDraws: Number(raw?.stats?.selfDraws ?? 0) || 0,
      biggestFan: Number(raw?.stats?.biggestFan ?? 0) || 0,
      biggestHand: String(raw?.stats?.biggestHand ?? ""),
      patterns: raw?.stats?.patterns ?? {},
    },
    friends: raw?.friends ?? {},
  };
}

export interface RoundOutcome {
  wallet: Wallet;
  stats: PlayerStats;
}

/** Pure: the profile's wallet + stats after a finished round. The wallet
 * moves by the real HK settlement (earningsForRound); stats accrue a hand
 * played, and -- on a win -- the win/self-draw counts, the biggest-hand
 * record, and the winning patterns. */
export function applyRoundToProfile(
  profile: Profile,
  state: GameState,
  seat: number,
  isOnline: boolean
): RoundOutcome {
  const kind: keyof Wallet = isOnline ? "online" : "solo";
  const wallet: Wallet = { ...profile.wallet };
  wallet[kind] += earningsForRound(state, seat);

  const stats: PlayerStats = {
    ...profile.stats,
    handsPlayed: profile.stats.handsPlayed + 1,
    patterns: { ...profile.stats.patterns },
  };

  const win = state.winners?.find((w) => w.seat === seat);
  if (win) {
    stats.wins += 1;
    if (win.selfDraw) stats.selfDraws += 1;
    // Count only the real hand-pattern fans (skip the automatic Self-Draw /
    // No Flowers / Flowers bonuses) so "favorite pattern" is about the hand.
    const BONUS = new Set(["Self-Draw", "No Flowers", "Flowers", "Kong Replacement Win", "Last Tile", "Concealed Hand", "Robbing the Kong"]);
    for (const b of win.breakdown) {
      if (!BONUS.has(b.label)) stats.patterns[b.label] = (stats.patterns[b.label] ?? 0) + 1;
    }
    if (win.fan > stats.biggestFan) {
      stats.biggestFan = win.fan;
      stats.biggestHand = win.breakdown.map((b) => `${b.label} (${b.fan})`).join(" · ");
    }
  }

  return { wallet, stats };
}

export function favoritePattern(stats: PlayerStats): string | null {
  let best: string | null = null;
  let bestN = 0;
  for (const [label, n] of Object.entries(stats.patterns)) {
    if (n > bestN) {
      best = label;
      bestN = n;
    }
  }
  return best;
}

export function winRate(stats: PlayerStats): number {
  return stats.handsPlayed === 0 ? 0 : stats.wins / stats.handsPlayed;
}
