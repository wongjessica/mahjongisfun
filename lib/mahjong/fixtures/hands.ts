import { Tile, TileSuit } from "../tiles";

let counter = 0;

export function t(suit: TileSuit, rank: number): Tile {
  counter += 1;
  return { id: `${suit}-${rank}-fx${counter}`, suit, rank };
}

function hand(specs: [TileSuit, number][]): Tile[] {
  return specs.map(([suit, rank]) => t(suit, rank));
}

/** 111 234 567 888(triplet)? -- actually: 111 234 567 888 99, all characters. */
export function fullFlushHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 1],
    ["characters", 1],
    ["characters", 2],
    ["characters", 3],
    ["characters", 4],
    ["characters", 5],
    ["characters", 6],
    ["characters", 7],
    ["characters", 8],
    ["characters", 8],
    ["characters", 8],
    ["characters", 9],
    ["characters", 9],
  ]);
}

/** Same shape as fullFlushHand but the pair is a dragon pair instead of 99. */
export function halfFlushHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 1],
    ["characters", 1],
    ["characters", 2],
    ["characters", 3],
    ["characters", 4],
    ["characters", 5],
    ["characters", 6],
    ["characters", 7],
    ["characters", 8],
    ["characters", 8],
    ["characters", 8],
    ["dragons", 1],
    ["dragons", 1],
  ]);
}

/** Four triplets across mixed suits + a pair -- no flush, all triplets. */
export function allTripletsHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 1],
    ["characters", 1],
    ["bamboo", 5],
    ["bamboo", 5],
    ["bamboo", 5],
    ["dragons", 1],
    ["dragons", 1],
    ["dragons", 1],
    ["winds", 2],
    ["winds", 2],
    ["winds", 2],
    ["dots", 9],
    ["dots", 9],
  ]);
}

export function sevenPairsHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 1],
    ["bamboo", 2],
    ["bamboo", 2],
    ["dots", 3],
    ["dots", 3],
    ["winds", 1],
    ["winds", 1],
    ["winds", 2],
    ["winds", 2],
    ["dragons", 1],
    ["dragons", 1],
    ["dragons", 2],
    ["dragons", 2],
  ]);
}

export function thirteenOrphansHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 1],
    ["characters", 9],
    ["bamboo", 1],
    ["bamboo", 9],
    ["dots", 1],
    ["dots", 9],
    ["winds", 1],
    ["winds", 2],
    ["winds", 3],
    ["winds", 4],
    ["dragons", 1],
    ["dragons", 2],
    ["dragons", 3],
  ]);
}

/** Characters 111 222 333 + dots 777 + bamboo 55 pair. The 111/222/333 run
 * can be read as three triplets (-> All Triplets, 3 fan) or as three
 * identical sequences 123/123/123 (-> no named pattern, 0 fan). The scorer
 * must pick the higher-fan reading. */
export function ambiguousDecompositionHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 1],
    ["characters", 1],
    ["characters", 2],
    ["characters", 2],
    ["characters", 2],
    ["characters", 3],
    ["characters", 3],
    ["characters", 3],
    ["dots", 7],
    ["dots", 7],
    ["dots", 7],
    ["bamboo", 5],
    ["bamboo", 5],
  ]);
}

/** A plain 2-fan hand (self-draw + dealer, no named patterns) for testing
 * the 0-fan vs 3-fan minimum win-declaration gate. */
export function twoFanHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 2],
    ["characters", 3],
    ["bamboo", 4],
    ["bamboo", 5],
    ["bamboo", 6],
    ["dots", 7],
    ["dots", 8],
    ["dots", 9],
    ["characters", 5],
    ["characters", 6],
    ["characters", 7],
    ["dots", 2],
    ["dots", 2],
  ]);
}

/** Not a winning hand at all: random unconnected tiles. */
export function nonWinningHand(): Tile[] {
  return hand([
    ["characters", 1],
    ["characters", 4],
    ["bamboo", 2],
    ["bamboo", 9],
    ["dots", 3],
    ["dots", 6],
    ["winds", 1],
    ["winds", 3],
    ["dragons", 2],
    ["characters", 8],
    ["bamboo", 5],
    ["dots", 1],
    ["winds", 4],
    ["dragons", 3],
  ]);
}
