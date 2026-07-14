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
  return assignNamesForSeats([0, 1, 2, 3].filter((seat) => seat !== humanSeat));
}

/** Same random-distinct naming, for an arbitrary set of bot seats -- online
 * rooms have anywhere from 0 to 2 bot seats depending on how many humans
 * joined. */
export function assignNamesForSeats(seats: number[]): Record<number, string> {
  const pool = [...NAME_POOL];
  const names: Record<number, string> = {};
  for (const seat of seats) {
    const index = Math.floor(Math.random() * pool.length);
    names[seat] = pool.splice(index, 1)[0];
  }
  return names;
}
