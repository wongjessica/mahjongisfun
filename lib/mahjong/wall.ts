import { RNG } from "./rng";
import { Tile, buildFullSet, shuffle } from "./tiles";

export const HAND_SIZE = 13;

export interface Wall {
  liveTiles: Tile[];
  /** Retained for state-shape/serialization stability but always empty:
   * this variant reserves no dead wall, so every tile is drawable and the
   * round only draws out when the wall is truly empty. */
  deadWall: Tile[];
}

export function buildWall(rng: RNG): Wall {
  return { liveTiles: shuffle(buildFullSet(), rng), deadWall: [] };
}

export function liveTileCount(wall: Wall): number {
  return wall.liveTiles.length;
}

export function isWallExhausted(wall: Wall): boolean {
  return wall.liveTiles.length === 0;
}

export function drawFromWall(wall: Wall): { tile: Tile; wall: Wall } {
  if (wall.liveTiles.length === 0) {
    throw new Error("Cannot draw: wall is empty");
  }
  const [tile, ...rest] = wall.liveTiles;
  return { tile, wall: { ...wall, liveTiles: rest } };
}

export function hasReplacementTile(wall: Wall): boolean {
  return wall.liveTiles.length > 0;
}

/** Flower/kong replacement tiles come from the BACK of the wall (the end a
 * dead wall would traditionally occupy) while normal draws come from the
 * front, so the two never collide and no tile is set permanently aside. */
export function drawReplacement(wall: Wall): { tile: Tile; wall: Wall } {
  if (wall.liveTiles.length === 0) {
    throw new Error("Cannot draw replacement: wall is empty");
  }
  const tile = wall.liveTiles[wall.liveTiles.length - 1];
  return { tile, wall: { ...wall, liveTiles: wall.liveTiles.slice(0, -1) } };
}

export interface InitialDeal {
  hands: Tile[][];
  wall: Wall;
}

/** Deals HAND_SIZE tiles to each of 4 seats (in seat order), then draws the
 * dealer's 14th tile so the very first turn is "dealer discards". */
export function dealInitialHands(wall: Wall, dealerIndex: number): InitialDeal {
  let currentWall = wall;
  const hands: Tile[][] = [[], [], [], []];

  for (let seat = 0; seat < 4; seat++) {
    for (let i = 0; i < HAND_SIZE; i++) {
      const { tile, wall: nextWall } = drawFromWall(currentWall);
      hands[seat].push(tile);
      currentWall = nextWall;
    }
  }

  const { tile: dealerExtra, wall: wallAfterExtra } = drawFromWall(currentWall);
  hands[dealerIndex].push(dealerExtra);

  return { hands, wall: wallAfterExtra };
}
