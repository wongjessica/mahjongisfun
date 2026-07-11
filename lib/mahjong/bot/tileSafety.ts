import { Meld } from "../melds";
import { PlayerState } from "../state";
import { Tile, isTerminalOrHonor, tileKey } from "../tiles";

/** Rough, non-simulated danger heuristic for discarding `candidate` against
 * a single opponent: higher is safer. Not a full read of their hand -- just
 * "have they shown me this is safe" and "have they shown interest nearby." */
function safetyAgainst(candidate: Tile, opponent: PlayerState): number {
  let score = 0;

  if (opponent.discards.some((t) => tileKey(t) === tileKey(candidate))) {
    score += 2;
  }

  for (const meld of opponent.melds) {
    if (meldSuggestsDanger(meld, candidate)) score -= 2;
  }

  return score;
}

function meldSuggestsDanger(meld: Meld, candidate: Tile): boolean {
  const meldTile = meld.tiles[0];
  if (meldTile.suit !== candidate.suit) return false;
  if (meldTile.suit === "winds" || meldTile.suit === "dragons") {
    return meldTile.rank === candidate.rank;
  }
  const ranks = meld.tiles.map((t) => t.rank);
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  return candidate.rank >= min - 2 && candidate.rank <= max + 2;
}

export function tileSafetyScore(candidate: Tile, opponents: PlayerState[]): number {
  let score = opponents.reduce((sum, opp) => sum + safetyAgainst(candidate, opp), 0);
  if (isTerminalOrHonor(candidate)) score += 1;
  return score;
}
