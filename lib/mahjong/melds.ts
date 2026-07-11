import { Tile, isSuited, tileKey } from "./tiles";

export type MeldType = "chi" | "pon" | "kongConcealed" | "kongExposed" | "kongAdded";

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  /** Seat the meld's called tile came from (undefined for a concealed kong). */
  calledFromSeat?: number;
  /** The specific tile id that was called from a discard (or added, for kongAdded). */
  calledTileId?: string;
}

export function meldTileCount(type: MeldType): number {
  return type === "chi" || type === "pon" ? 3 : 4;
}

export function isKong(meld: Meld): boolean {
  return meld.type === "kongConcealed" || meld.type === "kongExposed" || meld.type === "kongAdded";
}

export function isConcealedMeld(meld: Meld): boolean {
  return meld.type === "kongConcealed";
}

/** Finds every distinct pair of concealed tiles that could join `discard` into a chi (sequence). */
export function findChiOptions(concealed: Tile[], discard: Tile): Tile[][] {
  if (!isSuited(discard)) return [];
  const bySuitRank = new Map<number, Tile>();
  for (const t of concealed) {
    if (t.suit === discard.suit && !bySuitRank.has(t.rank)) {
      bySuitRank.set(t.rank, t);
    }
  }
  const options: Tile[][] = [];
  const triples: [number, number][] = [
    [discard.rank - 2, discard.rank - 1],
    [discard.rank - 1, discard.rank + 1],
    [discard.rank + 1, discard.rank + 2],
  ];
  for (const [r1, r2] of triples) {
    if (r1 < 1 || r2 > 9) continue;
    const t1 = bySuitRank.get(r1);
    const t2 = bySuitRank.get(r2);
    if (t1 && t2) options.push([t1, t2]);
  }
  return options;
}

export function canPon(concealed: Tile[], discard: Tile): Tile[] | null {
  const matches = concealed.filter((t) => tileKey(t) === tileKey(discard));
  return matches.length >= 2 ? matches.slice(0, 2) : null;
}

export function canKongExposed(concealed: Tile[], discard: Tile): Tile[] | null {
  const matches = concealed.filter((t) => tileKey(t) === tileKey(discard));
  return matches.length >= 3 ? matches.slice(0, 3) : null;
}

export function findConcealedKongOptions(concealed: Tile[]): string[] {
  const counts = new Map<string, number>();
  for (const t of concealed) {
    const key = tileKey(t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 4).map(([key]) => key);
}

export function findAddedKongOptions(concealed: Tile[], melds: Meld[]): Meld[] {
  return melds.filter(
    (meld) =>
      meld.type === "pon" &&
      concealed.some((t) => tileKey(t) === tileKey(meld.tiles[0]))
  );
}
