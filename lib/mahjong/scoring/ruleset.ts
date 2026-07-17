/** Selectable win minimums: 0 (chicken hands allowed), 3 (standard HK), or
 * 5 (high-stakes -- only flushes, big triplet hands, and limit shapes
 * reliably clear it). */
export type FanMinimum = 0 | 3 | 5;

export interface Ruleset {
  /** Minimum fan required to legally declare a win. */
  fanMinimum: FanMinimum;
  /** Fan total is capped at this value (standard "limit hand"). */
  limitFan: number;
  /** Fan awarded per flower/season tile that matches the holder's own seat
   * (rank === seatWind) -- an off-seat flower is worth nothing. */
  seatMatchFlowerFanEach: number;
  /** Flowers are luck, not hand pattern: their total fan contribution is
   * capped, and (separately, enforced in calculate.ts) never counts toward
   * clearing the fan minimum on their own. */
  flowerFanCap: number;
}

export const DEFAULT_RULESET: Ruleset = {
  fanMinimum: 3,
  limitFan: 13,
  seatMatchFlowerFanEach: 1,
  flowerFanCap: 2,
};

export function createRuleset(fanMinimum: FanMinimum): Ruleset {
  return { ...DEFAULT_RULESET, fanMinimum };
}
