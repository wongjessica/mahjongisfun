import { getBalance, setBalance } from "@/lib/wallet";
import { EMPTY_STATS, PlayerStats, Profile } from "./types";

const STATS_KEY = "mahjong-stats";

/** Guest profile: wallet from the existing wallet keys, stats from their own
 * key. (Friends are a signed-in-only concept, so guests always have none.) */
export function loadLocalProfile(): Profile {
  let stats: PlayerStats = EMPTY_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) stats = { ...EMPTY_STATS, ...JSON.parse(raw) };
  } catch {
    stats = EMPTY_STATS;
  }
  return {
    wallet: { solo: getBalance("solo"), online: getBalance("online") },
    stats,
    friends: {},
  };
}

export function saveLocalProfile(profile: Profile): void {
  setBalance("solo", profile.wallet.solo);
  setBalance("online", profile.wallet.online);
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(profile.stats));
  } catch {
    // Non-fatal.
  }
}
