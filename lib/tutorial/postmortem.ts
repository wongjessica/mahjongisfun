import { decomposeHand } from "@/lib/mahjong/decompose";
import { bestScore } from "@/lib/mahjong/scoring/calculate";
import { ScoringContext } from "@/lib/mahjong/scoring/fan-table";
import { GameState } from "@/lib/mahjong/state";
import { TILE_TYPES } from "@/lib/mahjong/tile-index";
import { Tile, tileKey } from "@/lib/mahjong/tiles";

/** One tile type the player's hand was waiting on to win. */
export interface WaitInfo {
  /** A representative tile of the winning type (for rendering its face). */
  tile: Tile;
  /** Best fan the completed hand would score on this tile (0 = chicken hand). */
  fan: number;
  /** Human-readable pattern labels making up that fan. */
  patterns: string[];
  /** Copies still unseen in the wall -- i.e. actually still winnable. */
  copiesInWall: number;
  /** Copies sitting face-up in the discard piles. */
  copiesDiscarded: number;
  /** Copies held (concealed or melded) by the OTHER players. */
  copiesHeldByOthers: number;
}

export interface Postmortem {
  /** True if the hand was one tile from a win (had at least one wait). */
  tenpai: boolean;
  waits: WaitInfo[];
  /** Highest fan achievable across all the waits. */
  bestFan: number;
}

function makeTile(suit: Tile["suit"], rank: number): Tile {
  return { id: `wait-${suit}-${rank}`, suit, rank };
}

/** Counts how many copies of `key` are visible (accounted for) across a set
 * of tile arrays. */
function countKey(tiles: Tile[], key: string): number {
  return tiles.reduce((n, t) => (tileKey(t) === key ? n + 1 : n), 0);
}

/** Analyses the human seat's hand at the end of a round they DIDN'T win, so
 * the tutorial can explain: which tiles would have completed it, whether any
 * were even still gettable, and how much the hand would have been worth.
 * Pure -- reads only engine state and the same decompose/score functions the
 * real win check uses, so it can never claim a "win" the engine wouldn't. */
export function analyzePostmortem(state: GameState, seat: number): Postmortem {
  const me = state.players[seat];
  const hand = me.concealedTiles;
  const melds = me.melds;

  const waits: WaitInfo[] = [];

  for (const type of TILE_TYPES) {
    const key = `${type.suit}-${type.rank}`;
    const candidate = [...hand, makeTile(type.suit, type.rank)];
    const decompositions = decomposeHand(candidate, melds);
    if (decompositions.length === 0) continue; // not a winning wait

    // Score it as a plain win (no self-draw/last-tile bonuses, which would be
    // artefacts of the round's exact ending) so the "what it was worth" figure
    // reflects the hand's real pattern value.
    const ctx: ScoringContext = {
      selfDraw: false,
      isReplacementWin: false,
      isRobbingKong: false,
      winningTileKey: key,
      isLastTile: false,
      seatWind: me.seatWind,
      roundWind: state.roundWind,
      flowers: me.flowers,
      ruleset: state.ruleset,
    };
    const score = bestScore(decompositions, ctx);
    if (!score) continue;

    // Where did all four copies of this tile go?
    let discarded = 0;
    let others = 0;
    const mine = countKey(hand, key) + melds.reduce((n, m) => n + countKey(m.tiles, key), 0);
    for (const p of state.players) {
      discarded += countKey(p.discards, key);
      if (p.seat === seat) continue;
      others += countKey(p.concealedTiles, key);
      others += p.melds.reduce((n, m) => n + countKey(m.tiles, key), 0);
    }
    const copiesInWall = Math.max(0, 4 - discarded - others - mine);

    waits.push({
      tile: makeTile(type.suit, type.rank),
      fan: score.fan,
      patterns: score.breakdown.map((b) => b.label),
      copiesInWall,
      copiesDiscarded: discarded,
      copiesHeldByOthers: others,
    });
  }

  // Show the most valuable waits first.
  waits.sort((a, b) => b.fan - a.fan);

  return {
    tenpai: waits.length > 0,
    waits,
    bestFan: waits.reduce((max, w) => Math.max(max, w.fan), 0),
  };
}
