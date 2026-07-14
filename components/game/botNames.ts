const NAME_POOL = [
  "Bamboo",
  "Lotus",
  "Jade",
  "Plum",
  "Ginger",
  "Comet",
  "Maple",
  "Sable",
  "Orchid",
  "Nimbus",
  "Ember",
  "Willow",
  "Koi",
  "Mochi",
  "Sparrow",
  "Lantern",
  "Peony",
  "Tofu",
  "Ronin",
  "Cricket",
];

/** Assigns a random, distinct display name to each bot seat (never the
 * human's), so "which bot won/discarded" is never ambiguous. Computed once
 * per game at setup time, not derived from seat/wind, so it stays stable
 * for the whole round. */
export function assignBotNames(humanSeat: number): Record<number, string> {
  const pool = [...NAME_POOL];
  const names: Record<number, string> = {};
  for (let seat = 0; seat < 4; seat++) {
    if (seat === humanSeat) continue;
    const index = Math.floor(Math.random() * pool.length);
    names[seat] = pool.splice(index, 1)[0];
  }
  return names;
}
