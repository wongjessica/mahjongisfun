import { GameAction, LegalAction } from "./actions";
import { decomposeHand } from "./decompose";
import {
  Meld,
  canKongExposed,
  canPon,
  findAddedKongOptions,
  findChiOptions,
  findConcealedKongOptions,
} from "./melds";
import { bestScore, isValidWinDeclaration } from "./scoring/calculate";
import { ScoringContext } from "./scoring/fan-table";
import { createRuleset } from "./scoring/ruleset";
import {
  CallResponse,
  GameState,
  PlayerState,
  WinResult,
  Wind,
  nextSeat,
  otherSeats,
} from "./state";
import { Tile, isBonus, tileKey } from "./tiles";
import {
  Wall,
  buildWall,
  dealInitialHands,
  drawFromWall,
  drawReplacement,
  hasReplacementTile,
  isWallExhausted,
} from "./wall";
import { RNG, createRng } from "./rng";

export interface InitialStateConfig {
  fanMinimum: 0 | 3;
  humanSeat?: number;
  dealerIndex?: number;
  seed: number;
}

function resolvePlayerFlowers(
  concealedTiles: Tile[],
  wall: Wall
): { concealedTiles: Tile[]; flowers: Tile[]; wall: Wall } {
  let tiles = concealedTiles;
  let flowers: Tile[] = [];
  let currentWall = wall;

  while (true) {
    const bonusTiles = tiles.filter(isBonus);
    if (bonusTiles.length === 0) break;
    tiles = tiles.filter((t) => !isBonus(t));
    flowers = [...flowers, ...bonusTiles];
    for (const _ of bonusTiles) {
      if (!hasReplacementTile(currentWall)) break;
      const { tile, wall: nextWall } = drawReplacement(currentWall);
      currentWall = nextWall;
      tiles = [...tiles, tile];
    }
  }

  return { concealedTiles: tiles, flowers, wall: currentWall };
}

export function createInitialState(config: InitialStateConfig): GameState {
  const rng: RNG = createRng(config.seed);
  const dealerIndex = config.dealerIndex ?? 0;
  const humanSeat = config.humanSeat ?? 0;

  let wall = buildWall(rng);
  const { hands, wall: wallAfterDeal } = dealInitialHands(wall, dealerIndex);
  wall = wallAfterDeal;

  const players: PlayerState[] = [];
  for (let seat = 0; seat < 4; seat++) {
    const { concealedTiles, flowers, wall: newWall } = resolvePlayerFlowers(hands[seat], wall);
    wall = newWall;
    const seatWind = (((seat - dealerIndex + 4) % 4) + 1) as Wind;
    players.push({
      seat,
      seatWind,
      isBot: seat !== humanSeat,
      concealedTiles,
      melds: [],
      discards: [],
      flowers,
      score: 0,
    });
  }

  return {
    players: players as GameState["players"],
    wall,
    dealerIndex,
    roundWind: 1,
    turn: { phase: "awaiting-discard", activeSeat: dealerIndex },
    pendingCallWindow: null,
    ruleset: createRuleset(config.fanMinimum),
    lastDrawWasReplacement: false,
    winners: null,
    isDraw: false,
  };
}

function updatePlayer(state: GameState, seat: number, update: Partial<PlayerState>): GameState {
  const players = state.players.slice() as GameState["players"];
  players[seat] = { ...players[seat], ...update };
  return { ...state, players };
}

function buildScoringContext(
  state: GameState,
  seat: number,
  opts: { selfDraw: boolean; isReplacementWin: boolean; isRobbingKong: boolean }
): ScoringContext {
  const player = state.players[seat];
  return {
    isDealer: seat === state.dealerIndex,
    selfDraw: opts.selfDraw,
    isReplacementWin: opts.isReplacementWin,
    isRobbingKong: opts.isRobbingKong,
    seatWind: player.seatWind,
    roundWind: state.roundWind,
    flowers: player.flowers,
    ruleset: state.ruleset,
  };
}

function canDeclareWin(
  state: GameState,
  seat: number,
  extraTile: Tile | null,
  opts: { selfDraw: boolean; isReplacementWin: boolean; isRobbingKong: boolean }
): boolean {
  const player = state.players[seat];
  const concealed = extraTile ? [...player.concealedTiles, extraTile] : player.concealedTiles;
  const decompositions = decomposeHand(concealed, player.melds);
  return isValidWinDeclaration(decompositions, buildScoringContext(state, seat, opts));
}

/** Resolves a just-drawn tile for `seat`: flower/season tiles are set aside
 * and chain into another replacement draw (awaiting-flower-replacement);
 * anything else joins the hand and it becomes that seat's turn to act. */
function resolveDrawnTileForSeat(
  state: GameState,
  seat: number,
  tile: Tile,
  opts: { isReplacement: boolean }
): GameState {
  let next = state;
  if (isBonus(tile)) {
    next = updatePlayer(next, seat, { flowers: [...next.players[seat].flowers, tile] });
    return { ...next, turn: { phase: "awaiting-flower-replacement", activeSeat: seat } };
  }
  next = updatePlayer(next, seat, {
    concealedTiles: [...next.players[seat].concealedTiles, tile],
  });
  return {
    ...next,
    lastDrawWasReplacement: opts.isReplacement,
    turn: { phase: "awaiting-discard", activeSeat: seat },
  };
}

function drawKongReplacement(state: GameState, seat: number): GameState {
  if (!hasReplacementTile(state.wall)) {
    return { ...state, isDraw: true, turn: { ...state.turn, phase: "round-ended" } };
  }
  const { tile, wall } = drawReplacement(state.wall);
  return resolveDrawnTileForSeat({ ...state, wall }, seat, tile, { isReplacement: true });
}

function advanceToNextDraw(state: GameState, fromSeat: number): GameState {
  if (isWallExhausted(state.wall)) {
    return { ...state, isDraw: true, turn: { ...state.turn, phase: "round-ended" } };
  }
  return {
    ...state,
    pendingCallWindow: null,
    turn: { phase: "awaiting-draw", activeSeat: nextSeat(fromSeat) },
  };
}

function hasAnyCallOption(
  state: GameState,
  seat: number,
  discard: Tile,
  discardingSeat: number
): boolean {
  const player = state.players[seat];
  if (seat === nextSeat(discardingSeat) && findChiOptions(player.concealedTiles, discard).length > 0) {
    return true;
  }
  if (canPon(player.concealedTiles, discard)) return true;
  if (canKongExposed(player.concealedTiles, discard)) return true;
  if (canDeclareWin(state, seat, discard, { selfDraw: false, isReplacementWin: false, isRobbingKong: false })) {
    return true;
  }
  return false;
}

function closestToDiscarder(seats: number[], discardingSeat: number): number {
  return seats.reduce((best, seat) => {
    const offset = (seat - discardingSeat + 4) % 4;
    const bestOffset = (best - discardingSeat + 4) % 4;
    return offset < bestOffset ? seat : best;
  });
}

// ---- action handlers ----

function handleDraw(state: GameState): GameState {
  if (state.turn.phase !== "awaiting-draw") return state;
  if (isWallExhausted(state.wall)) {
    return { ...state, isDraw: true, turn: { ...state.turn, phase: "round-ended" } };
  }
  const seat = state.turn.activeSeat;
  const { tile, wall } = drawFromWall(state.wall);
  return resolveDrawnTileForSeat({ ...state, wall }, seat, tile, { isReplacement: false });
}

function handleReplaceFlower(state: GameState): GameState {
  if (state.turn.phase !== "awaiting-flower-replacement") return state;
  const seat = state.turn.activeSeat;
  if (!hasReplacementTile(state.wall)) {
    return { ...state, isDraw: true, turn: { ...state.turn, phase: "round-ended" } };
  }
  const { tile, wall } = drawReplacement(state.wall);
  return resolveDrawnTileForSeat({ ...state, wall }, seat, tile, { isReplacement: true });
}

function handleDiscard(state: GameState, tileId: string): GameState {
  if (state.turn.phase !== "awaiting-discard") return state;
  const seat = state.turn.activeSeat;
  const player = state.players[seat];
  const tile = player.concealedTiles.find((t) => t.id === tileId);
  if (!tile) return state;

  let next = updatePlayer(state, seat, {
    concealedTiles: player.concealedTiles.filter((t) => t.id !== tileId),
    discards: [...player.discards, tile],
  });
  next = { ...next, lastDrawWasReplacement: false };

  const eligibleSeats = otherSeats(seat).filter((s) => hasAnyCallOption(next, s, tile, seat));
  if (eligibleSeats.length === 0) {
    return advanceToNextDraw(next, seat);
  }

  return {
    ...next,
    turn: { ...next.turn, phase: "awaiting-call-responses" },
    pendingCallWindow: {
      discardedTile: tile,
      discardingSeat: seat,
      eligibleSeats,
      responses: {},
      winOnly: false,
    },
  };
}

function handleSelfDrawWin(state: GameState, seat: number): GameState {
  if (state.turn.phase !== "awaiting-discard" || seat !== state.turn.activeSeat) return state;
  const player = state.players[seat];
  const decompositions = decomposeHand(player.concealedTiles, player.melds);
  const ctx = buildScoringContext(state, seat, {
    selfDraw: true,
    isReplacementWin: state.lastDrawWasReplacement,
    isRobbingKong: false,
  });
  if (!isValidWinDeclaration(decompositions, ctx)) return state;
  const score = bestScore(decompositions, ctx)!;
  const wonTile = player.concealedTiles[player.concealedTiles.length - 1];
  const winResult: WinResult = {
    seat,
    decomposition: score.decomposition,
    fan: score.fan,
    selfDraw: true,
    wonTile,
    fromSeat: null,
    breakdown: score.breakdown,
  };

  let next = state;
  for (const payer of otherSeats(seat)) {
    next = updatePlayer(next, payer, { score: next.players[payer].score - score.fan });
  }
  next = updatePlayer(next, seat, { score: next.players[seat].score + score.fan * 3 });
  return { ...next, winners: [winResult], turn: { ...next.turn, phase: "round-ended" } };
}

function handleConcealedKong(state: GameState, seat: number, kongTileKey: string): GameState {
  if (state.turn.phase !== "awaiting-discard" || seat !== state.turn.activeSeat) return state;
  const player = state.players[seat];
  const matches = player.concealedTiles.filter((t) => tileKey(t) === kongTileKey);
  if (matches.length < 4) return state;

  const meld: Meld = { type: "kongConcealed", tiles: matches.slice(0, 4) };
  const remainingConcealed = player.concealedTiles.filter(
    (t) => !meld.tiles.some((m) => m.id === t.id)
  );
  const next = updatePlayer(state, seat, {
    concealedTiles: remainingConcealed,
    melds: [...player.melds, meld],
  });
  return drawKongReplacement(next, seat);
}

function handleAddedKong(state: GameState, seat: number, tileId: string): GameState {
  if (state.turn.phase !== "awaiting-discard" || seat !== state.turn.activeSeat) return state;
  const player = state.players[seat];
  const tile = player.concealedTiles.find((t) => t.id === tileId);
  if (!tile) return state;
  const meldIndex = player.melds.findIndex((m) => m.type === "pon" && tileKey(m.tiles[0]) === tileKey(tile));
  if (meldIndex === -1) return state;

  const updatedMeld: Meld = {
    ...player.melds[meldIndex],
    type: "kongAdded",
    tiles: [...player.melds[meldIndex].tiles, tile],
    calledTileId: tile.id,
  };
  const melds = player.melds.slice();
  melds[meldIndex] = updatedMeld;
  const remainingConcealed = player.concealedTiles.filter((t) => t.id !== tileId);
  const next = updatePlayer(state, seat, { concealedTiles: remainingConcealed, melds });

  const robbers = otherSeats(seat).filter((s) =>
    canDeclareWin(next, s, tile, { selfDraw: false, isReplacementWin: false, isRobbingKong: true })
  );
  if (robbers.length > 0) {
    return {
      ...next,
      turn: { ...next.turn, phase: "awaiting-call-responses" },
      pendingCallWindow: {
        discardedTile: tile,
        discardingSeat: seat,
        eligibleSeats: robbers,
        responses: {},
        winOnly: true,
      },
    };
  }

  return drawKongReplacement(next, seat);
}

function applyChi(
  state: GameState,
  seat: number,
  discardingSeat: number,
  discard: Tile,
  tileIds: [string, string]
): GameState {
  const player = state.players[seat];
  const t1 = player.concealedTiles.find((t) => t.id === tileIds[0]);
  const t2 = player.concealedTiles.find((t) => t.id === tileIds[1]);
  if (!t1 || !t2) return advanceToNextDraw({ ...state, pendingCallWindow: null }, discardingSeat);

  const meld: Meld = {
    type: "chi",
    tiles: [t1, t2, discard],
    calledFromSeat: discardingSeat,
    calledTileId: discard.id,
  };
  const remainingConcealed = player.concealedTiles.filter((t) => t.id !== t1.id && t.id !== t2.id);
  const discarder = state.players[discardingSeat];
  let next = updatePlayer(state, seat, {
    concealedTiles: remainingConcealed,
    melds: [...player.melds, meld],
  });
  next = updatePlayer(next, discardingSeat, {
    discards: discarder.discards.filter((t) => t.id !== discard.id),
  });
  return { ...next, pendingCallWindow: null, turn: { phase: "awaiting-discard", activeSeat: seat } };
}

function applyPon(state: GameState, seat: number, discardingSeat: number, discard: Tile): GameState {
  const player = state.players[seat];
  const matches = canPon(player.concealedTiles, discard);
  if (!matches) return advanceToNextDraw({ ...state, pendingCallWindow: null }, discardingSeat);

  const meld: Meld = {
    type: "pon",
    tiles: [...matches, discard],
    calledFromSeat: discardingSeat,
    calledTileId: discard.id,
  };
  const remainingConcealed = player.concealedTiles.filter(
    (t) => !matches.some((m) => m.id === t.id)
  );
  const discarder = state.players[discardingSeat];
  let next = updatePlayer(state, seat, {
    concealedTiles: remainingConcealed,
    melds: [...player.melds, meld],
  });
  next = updatePlayer(next, discardingSeat, {
    discards: discarder.discards.filter((t) => t.id !== discard.id),
  });
  return { ...next, pendingCallWindow: null, turn: { phase: "awaiting-discard", activeSeat: seat } };
}

function applyKongExposed(
  state: GameState,
  seat: number,
  discardingSeat: number,
  discard: Tile
): GameState {
  const player = state.players[seat];
  const matches = canKongExposed(player.concealedTiles, discard);
  if (!matches) return advanceToNextDraw({ ...state, pendingCallWindow: null }, discardingSeat);

  const meld: Meld = {
    type: "kongExposed",
    tiles: [...matches, discard],
    calledFromSeat: discardingSeat,
    calledTileId: discard.id,
  };
  const remainingConcealed = player.concealedTiles.filter(
    (t) => !matches.some((m) => m.id === t.id)
  );
  const discarder = state.players[discardingSeat];
  let next = updatePlayer(state, seat, {
    concealedTiles: remainingConcealed,
    melds: [...player.melds, meld],
  });
  next = updatePlayer(next, discardingSeat, {
    discards: discarder.discards.filter((t) => t.id !== discard.id),
  });
  next = { ...next, pendingCallWindow: null, turn: { phase: "awaiting-discard", activeSeat: seat } };
  return drawKongReplacement(next, seat);
}

function applyDiscardWins(
  state: GameState,
  winnerSeats: number[],
  discardingSeat: number,
  discard: Tile,
  isRobbingKong: boolean
): GameState {
  let next = state;
  const winners: WinResult[] = [];
  for (const seat of winnerSeats) {
    const player = next.players[seat];
    const concealed = [...player.concealedTiles, discard];
    const decompositions = decomposeHand(concealed, player.melds);
    const ctx = buildScoringContext(next, seat, {
      selfDraw: false,
      isReplacementWin: false,
      isRobbingKong,
    });
    if (!isValidWinDeclaration(decompositions, ctx)) continue;
    const score = bestScore(decompositions, ctx);
    if (!score) continue;
    winners.push({
      seat,
      decomposition: score.decomposition,
      fan: score.fan,
      selfDraw: false,
      wonTile: discard,
      fromSeat: discardingSeat,
      breakdown: score.breakdown,
    });
    next = updatePlayer(next, seat, { score: next.players[seat].score + score.fan });
    next = updatePlayer(next, discardingSeat, {
      score: next.players[discardingSeat].score - score.fan,
    });
  }
  return {
    ...next,
    winners,
    pendingCallWindow: null,
    turn: { ...next.turn, phase: "round-ended" },
  };
}

function resolveCallWindow(
  state: GameState,
  discard: Tile,
  discardingSeat: number,
  responses: Partial<Record<number, CallResponse>>,
  winOnly: boolean
): GameState {
  const winnerSeats = Object.entries(responses)
    .filter(([, r]) => r?.type === "win")
    .map(([seat]) => Number(seat));

  if (winnerSeats.length > 0) {
    return applyDiscardWins(state, winnerSeats, discardingSeat, discard, winOnly);
  }

  if (!winOnly) {
    const ponKongSeats = Object.entries(responses)
      .filter(([, r]) => r?.type === "pon" || r?.type === "kong")
      .map(([seat]) => Number(seat));
    if (ponKongSeats.length > 0) {
      const seat = closestToDiscarder(ponKongSeats, discardingSeat);
      const response = responses[seat]!;
      return response.type === "pon"
        ? applyPon(state, seat, discardingSeat, discard)
        : applyKongExposed(state, seat, discardingSeat, discard);
    }

    const chiEntry = Object.entries(responses).find(([, r]) => r?.type === "chi");
    if (chiEntry) {
      const [seatStr, response] = chiEntry;
      return applyChi(state, Number(seatStr), discardingSeat, discard, response!.chiTileIds!);
    }

    return advanceToNextDraw({ ...state, pendingCallWindow: null }, discardingSeat);
  }

  return drawKongReplacement({ ...state, pendingCallWindow: null }, discardingSeat);
}

function handleCallResponse(
  state: GameState,
  seat: number,
  response: CallResponse
): GameState {
  if (state.turn.phase !== "awaiting-call-responses" || !state.pendingCallWindow) return state;
  const window = state.pendingCallWindow;
  if (!window.eligibleSeats.includes(seat) || window.responses[seat]) return state;

  const responses = { ...window.responses, [seat]: response };
  const next: GameState = { ...state, pendingCallWindow: { ...window, responses } };

  const allResponded = window.eligibleSeats.every((s) => responses[s]);
  if (!allResponded) return next;

  return resolveCallWindow(next, window.discardedTile, window.discardingSeat, responses, window.winOnly);
}

export function mahjongReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "DRAW":
      return handleDraw(state);
    case "DISCARD":
      return handleDiscard(state, action.tileId);
    case "REPLACE_FLOWER":
      return handleReplaceFlower(state);
    case "CALL_CHI":
      return handleCallResponse(state, action.seat, { type: "chi", chiTileIds: action.tileIds });
    case "CALL_PON":
      return handleCallResponse(state, action.seat, { type: "pon" });
    case "CALL_KONG_EXPOSED":
      return handleCallResponse(state, action.seat, { type: "kong" });
    case "DECLARE_WIN":
      if (state.turn.phase === "awaiting-discard") return handleSelfDrawWin(state, action.seat);
      return handleCallResponse(state, action.seat, { type: "win" });
    case "PASS":
      return handleCallResponse(state, action.seat, { type: "pass" });
    case "CALL_KONG_CONCEALED":
      return handleConcealedKong(state, action.seat, action.tileKey);
    case "CALL_KONG_ADDED":
      return handleAddedKong(state, action.seat, action.tileId);
    default:
      return state;
  }
}

export function getLegalActions(state: GameState, seat: number): LegalAction[] {
  const { turn, pendingCallWindow } = state;
  const player = state.players[seat];

  if (turn.phase === "round-ended") return [];

  if (turn.phase === "awaiting-draw") {
    return seat === turn.activeSeat ? [{ type: "DRAW" }] : [];
  }

  if (turn.phase === "awaiting-flower-replacement") {
    return seat === turn.activeSeat ? [{ type: "REPLACE_FLOWER" }] : [];
  }

  if (turn.phase === "awaiting-discard") {
    if (seat !== turn.activeSeat) return [];
    const actions: LegalAction[] = player.concealedTiles.map((t) => ({
      type: "DISCARD",
      tileId: t.id,
    }));
    if (
      canDeclareWin(state, seat, null, {
        selfDraw: true,
        isReplacementWin: state.lastDrawWasReplacement,
        isRobbingKong: false,
      })
    ) {
      actions.push({ type: "DECLARE_WIN" });
    }
    for (const key of findConcealedKongOptions(player.concealedTiles)) {
      actions.push({ type: "CALL_KONG_CONCEALED", tileKey: key });
    }
    for (const meld of findAddedKongOptions(player.concealedTiles, player.melds)) {
      const tile = player.concealedTiles.find((t) => tileKey(t) === tileKey(meld.tiles[0]));
      if (tile) actions.push({ type: "CALL_KONG_ADDED", tileId: tile.id });
    }
    return actions;
  }

  if (turn.phase === "awaiting-call-responses" && pendingCallWindow) {
    if (!pendingCallWindow.eligibleSeats.includes(seat)) return [];
    if (pendingCallWindow.responses[seat]) return [];

    const actions: LegalAction[] = [{ type: "PASS" }];
    const discard = pendingCallWindow.discardedTile;

    if (
      canDeclareWin(state, seat, discard, {
        selfDraw: false,
        isReplacementWin: false,
        isRobbingKong: pendingCallWindow.winOnly,
      })
    ) {
      actions.push({ type: "DECLARE_WIN" });
    }

    if (!pendingCallWindow.winOnly) {
      if (seat === nextSeat(pendingCallWindow.discardingSeat)) {
        for (const pair of findChiOptions(player.concealedTiles, discard)) {
          actions.push({ type: "CALL_CHI", tileIds: [pair[0].id, pair[1].id] });
        }
      }
      if (canPon(player.concealedTiles, discard)) actions.push({ type: "CALL_PON" });
      if (canKongExposed(player.concealedTiles, discard)) actions.push({ type: "CALL_KONG_EXPOSED" });
    }

    return actions;
  }

  return [];
}
