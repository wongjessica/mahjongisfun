import { LegalAction } from "../actions";
import { GameState, PlayerState, otherSeats } from "../state";
import { isSuitType } from "../tile-index";
import { SuitType, Tile, tileKey } from "../tiles";
import { calculateStandardShanten, sevenPairsShanten } from "./shanten";
import { BotStrategy } from "./strategy";
import { tileSafetyScore } from "./tileSafety";

/**
 * Fan-aware bot. The shanten-greedy predecessor chased the nearest win with
 * zero regard for value, which under a 3/5-fan minimum produced hands it
 * could never legally declare -- games decayed into walls of draws while
 * the bots sat on dead mixed-suit hands. This bot instead commits to a PLAN
 * that structurally clears the table minimum, keeps only plan tiles, sheds
 * everything else early, and only calls melds that advance the plan:
 *
 *   flush     -- one suit (+honors unless "pure"): Half Flush 3 / Full 7
 *   triplets  -- pairs into pons: All Triplets 3, stacks with dragons/winds
 *   sevenPairs-- concealed pair collection: 4 (only at minimums it clears)
 *   plain     -- raw shanten race, only ever used at a 0-fan table
 */

type Plan =
  | { kind: "flush"; suit: SuitType; pure: boolean }
  | { kind: "triplets" }
  | { kind: "sevenPairs" }
  | { kind: "plain" };

type DiscardAction = Extract<LegalAction, { type: "DISCARD" }>;

const SUITS: SuitType[] = ["characters", "dots", "bamboo"];

function isHonor(tile: Tile): boolean {
  return !isSuitType(tile.suit);
}

function kindCounts(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tiles) counts.set(tileKey(tile), (counts.get(tileKey(tile)) ?? 0) + 1);
  return counts;
}

/** Melds already on the table are commitments the plan must honor. */
function planFromMelds(player: PlayerState): Plan | null {
  const chiSuits = new Set<SuitType>();
  const ponSuits = new Set<SuitType>();
  let honorPons = 0;
  for (const meld of player.melds) {
    const first = meld.tiles[0];
    if (meld.type === "chi") chiSuits.add(first.suit as SuitType);
    else if (isSuitType(first.suit)) ponSuits.add(first.suit);
    else honorPons++;
  }
  if (player.melds.length === 0) return null;

  // A chi locks its suit: the only fan route left through a chi is a flush.
  if (chiSuits.size > 0) {
    return { kind: "flush", suit: [...chiSuits][0], pure: false };
  }
  // Pons in two different suits can only be All Triplets.
  if (ponSuits.size >= 2) return { kind: "triplets" };
  // Pons in one suit (or only honors) keep both routes open; pick by hand.
  if (ponSuits.size === 1) {
    const suit = [...ponSuits][0];
    const inSuit = player.concealedTiles.filter((t) => t.suit === suit).length;
    const honors = player.concealedTiles.filter(isHonor).length;
    if (inSuit + honors >= player.concealedTiles.length - 2) {
      return { kind: "flush", suit, pure: false };
    }
    return { kind: "triplets" };
  }
  return honorPons > 0 ? { kind: "triplets" } : null;
}

function bestFlushSuit(tiles: Tile[]): { suit: SuitType; inSuit: number; honors: number } {
  const honors = tiles.filter(isHonor).length;
  let best: SuitType = "characters";
  let bestCount = -1;
  for (const suit of SUITS) {
    const count = tiles.filter((t) => t.suit === suit).length;
    if (count > bestCount) {
      best = suit;
      bestCount = count;
    }
  }
  return { suit: best, inSuit: bestCount, honors };
}

function pairedKindCount(tiles: Tile[]): number {
  let paired = 0;
  for (const count of kindCounts(tiles).values()) if (count >= 2) paired++;
  return paired;
}

function pickPlan(state: GameState, seat: number): Plan {
  const player = state.players[seat];
  const committed = planFromMelds(player);
  if (committed) return committed;

  const tiles = player.concealedTiles;
  const fanMinimum = state.ruleset.fanMinimum;
  const { suit, inSuit, honors } = bestFlushSuit(tiles);
  const paired = pairedKindCount(tiles);
  const pairsShanten = sevenPairsShanten(tiles);

  if (fanMinimum >= 5) {
    // Half Flush alone (3) doesn't clear 5 -- aim for Full Flush (7), only
    // keeping honors that are already paired (a pon of them adds fan and
    // still leaves Half Flush + All Triplets routes worth >= 5).
    return { kind: "flush", suit, pure: honors <= 1 };
  }

  // 3-fan (and used opportunistically at 0-fan): pick whichever plan the
  // dealt hand is already closest to.
  if (pairsShanten <= 2 && paired >= 4) return { kind: "sevenPairs" };
  if (paired >= 4 && inSuit + honors < 9) return { kind: "triplets" };
  if (fanMinimum === 0 && inSuit + honors < 8) return { kind: "plain" };
  return { kind: "flush", suit, pure: false };
}

/** Honor kinds worth keeping on a flush plan at a 5-fan table: only ones
 * already paired (pon-able for extra fan). Elsewhere all honors stay. */
function tileFitsPlan(tile: Tile, plan: Plan, counts: Map<string, number>): boolean {
  switch (plan.kind) {
    case "plain":
      return true;
    case "flush":
      if (tile.suit === plan.suit) return true;
      if (!isHonor(tile)) return false;
      return plan.pure ? (counts.get(tileKey(tile)) ?? 0) >= 2 : true;
    case "triplets":
      return isHonor(tile) || (counts.get(tileKey(tile)) ?? 0) >= 2;
    case "sevenPairs":
      return (counts.get(tileKey(tile)) ?? 0) === 2 || (counts.get(tileKey(tile)) ?? 0) === 1;
  }
}

/** Shanten toward the plan's shape, computed over plan-eligible tiles only
 * (off-plan tiles are treated as already-shed deadweight). */
function planShanten(tiles: Tile[], meldCount: number, plan: Plan): number {
  if (plan.kind === "sevenPairs") return sevenPairsShanten(tiles);
  const counts = kindCounts(tiles);
  const kept = tiles.filter((t) => tileFitsPlan(t, plan, counts));
  // Each missing tile (shed deadweight) is at least one more draw away.
  const deficit = tiles.length - kept.length;
  return calculateStandardShanten(kept, meldCount) + deficit;
}

function chooseDiscard(state: GameState, seat: number, discards: DiscardAction[], plan: Plan): LegalAction {
  const player = state.players[seat];
  const opponents = otherSeats(seat).map((s) => state.players[s]);
  const counts = kindCounts(player.concealedTiles);

  let best: { action: DiscardAction; score: number } | null = null;
  for (const action of discards) {
    const tile = player.concealedTiles.find((t) => t.id === action.tileId) as Tile;
    const remaining = player.concealedTiles.filter((t) => t.id !== action.tileId);
    const fits = tileFitsPlan(tile, plan, counts);
    // Seven pairs: a third copy of a paired kind is pure deadweight.
    const surplus = plan.kind === "sevenPairs" && (counts.get(tileKey(tile)) ?? 0) >= 3;

    const shanten = planShanten(remaining, player.melds.length, plan);
    const safety = tileSafetyScore(tile, opponents);
    // Ordered priorities, folded into one score: plan progress dominates,
    // off-plan tiles go first, safety breaks ties.
    const score =
      shanten * 1000 + (fits && !surplus ? 100 : 0) - safety;
    if (!best || score < best.score) best = { action, score };
  }
  return best!.action;
}

function callFitsPlan(state: GameState, seat: number, action: LegalAction, plan: Plan): boolean {
  const discard = state.pendingCallWindow?.discardedTile;
  if (!discard) return false;

  switch (plan.kind) {
    case "sevenPairs":
      return false; // any call breaks concealment (and eats a pair)
    case "plain":
      return true;
    case "triplets":
      return action.type !== "CALL_CHI";
    case "flush": {
      if (action.type === "CALL_CHI") {
        // A chi is only ever in the discard's own suit; at a pure-flush
        // table (5-fan) any honors still in hand would cap us below the
        // minimum, so chi only when the hand is already single-suited.
        if (discard.suit !== plan.suit) return false;
        if (!plan.pure) return true;
        return state.players[seat].concealedTiles.every(
          (t) => t.suit === plan.suit || isHonor(t)
        );
      }
      return discard.suit === plan.suit || isHonor(discard);
    }
  }
}

function simulateCallShanten(state: GameState, seat: number, action: LegalAction, plan: Plan): number | null {
  const player = state.players[seat];
  const discard = state.pendingCallWindow?.discardedTile;
  if (!discard) return null;

  let remaining: Tile[] | null = null;
  if (action.type === "CALL_CHI") {
    remaining = player.concealedTiles.filter((t) => !action.tileIds.includes(t.id));
  } else if (action.type === "CALL_PON") {
    const matches = player.concealedTiles.filter((t) => tileKey(t) === tileKey(discard)).slice(0, 2);
    remaining = player.concealedTiles.filter((t) => !matches.includes(t));
  } else if (action.type === "CALL_KONG_EXPOSED") {
    const matches = player.concealedTiles.filter((t) => tileKey(t) === tileKey(discard)).slice(0, 3);
    remaining = player.concealedTiles.filter((t) => !matches.includes(t));
  }
  if (!remaining) return null;
  return planShanten(remaining, player.melds.length + 1, plan);
}

function chooseCallResponse(state: GameState, seat: number, legalActions: LegalAction[], plan: Plan): LegalAction {
  const winAction = legalActions.find((a) => a.type === "DECLARE_WIN");
  if (winAction) return winAction;

  const player = state.players[seat];
  const passShanten = planShanten(player.concealedTiles, player.melds.length, plan);
  let best: { action: LegalAction; shanten: number } = { action: { type: "PASS" }, shanten: passShanten };

  for (const action of legalActions) {
    if (action.type !== "CALL_CHI" && action.type !== "CALL_PON" && action.type !== "CALL_KONG_EXPOSED") {
      continue;
    }
    if (!callFitsPlan(state, seat, action, plan)) continue;
    const shanten = simulateCallShanten(state, seat, action, plan);
    if (shanten !== null && shanten < best.shanten) best = { action, shanten };
  }
  return best.action;
}

export const smartStrategy: BotStrategy = {
  chooseAction(state, seat, legalActions) {
    if (legalActions.length === 1) return legalActions[0];

    const plan = pickPlan(state, seat);

    if (state.turn.phase === "awaiting-call-responses") {
      return chooseCallResponse(state, seat, legalActions, plan);
    }

    const winAction = legalActions.find((a) => a.type === "DECLARE_WIN");
    if (winAction) return winAction;

    // Own-turn kongs, only when the konged tile belongs to the plan (a
    // seven-pairs hand never kongs -- that spends two pairs).
    const kongAction = legalActions.find(
      (a) => a.type === "CALL_KONG_CONCEALED" || a.type === "CALL_KONG_ADDED"
    );
    if (kongAction && plan.kind !== "sevenPairs") {
      const player = state.players[seat];
      const counts = kindCounts(player.concealedTiles);
      const kongTile =
        kongAction.type === "CALL_KONG_ADDED"
          ? player.concealedTiles.find((t) => t.id === kongAction.tileId)
          : player.concealedTiles.find((t) => tileKey(t) === (kongAction as { tileKey: string }).tileKey);
      if (kongTile && tileFitsPlan(kongTile, plan, counts)) return kongAction;
    }

    const discardActions = legalActions.filter((a): a is DiscardAction => a.type === "DISCARD");
    if (discardActions.length > 0) return chooseDiscard(state, seat, discardActions, plan);
    return legalActions[0];
  },
};
