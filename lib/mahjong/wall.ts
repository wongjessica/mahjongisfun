import { RNG } from "./rng";
import { Tile, buildFullSet, shuffle } from "./tiles";

export const DEAD_WALL_SIZE = 14;
export const HAND_SIZE = 13;

export interface Wall {
  liveTiles: Tile[];
  deadWall: Tile[];
}

export function buildWall(rng: RNG): Wall {
  const shuffled = shuffle(buildFullSet(), rng);
  const deadWall = shuffled.slice(0, DEAD_WALL_SIZE);
  const liveTiles = shuffled.slice(DEAD_WALL_SIZE);
  return { liveTiles, deadWall };
}

export function liveTileCount(wall: Wall): number {
  return wall.liveTiles.length;
}

export function isWallExhausted(wall: Wall): boolean {
  return wall.liveTiles.length === 0;
}

export function drawFromWall(wall: Wall): { tile: Tile; wall: Wall } {
  if (wall.liveTiles.length === 0) {
    throw new Error("Cannot draw: live wall is empty");
  }
  const [tile, ...rest] = wall.liveTiles;
  return { tile, wall: { ...wall, liveTiles: rest } };
}

export function hasReplacementTile(wall: Wall): boolean {
  return wall.deadWall.length > 0;
}

export function drawReplacement(wall: Wall): { tile: Tile; wall: Wall } {
  if (wall.deadWall.length === 0) {
    throw new Error("Cannot draw replacement: dead wall is empty");
  }
  const [tile, ...rest] = wall.deadWall;
  return { tile, wall: { ...wall, deadWall: rest } };
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
