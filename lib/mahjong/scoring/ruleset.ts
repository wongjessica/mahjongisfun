export interface Ruleset {
  /** Minimum fan required to legally declare a win. */
  fanMinimum: 0 | 3;
  /** Fan total is capped at this value (standard "limit hand"). */
  limitFan: number;
  /** Fan awarded per flower/season tile held. */
  flowerFanEach: number;
  /** Extra fan awarded per flower/season tile that matches the holder's own seat. */
  seatMatchFlowerFanEach: number;
}

export const DEFAULT_RULESET: Ruleset = {
  fanMinimum: 3,
  limitFan: 13,
  flowerFanEach: 1,
  seatMatchFlowerFanEach: 1,
};

export function createRuleset(fanMinimum: 0 | 3): Ruleset {
  return { ...DEFAULT_RULESET, fanMinimum };
}
