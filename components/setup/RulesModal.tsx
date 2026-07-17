"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="text-left">
      <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-800">{title}</h3>
      <div className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

const FAN_TABLE: [string, string][] = [
  ["All Sequences (Ping Wu) — 4 chows + a pair that isn't a dragon or your seat/round wind", "1"],
  ["Self-Draw", "1"],
  ["Concealed Hand (no called melds)", "1"],
  ["Seat Wind triplet / Round Wind triplet", "1 each"],
  ["Dragon triplet", "1 each"],
  ["Robbing the Kong (winning on a tile added to a kong)", "1"],
  ["Kong Replacement Win (winning on the replacement draw)", "1"],
  ["Last Tile (winning on, or off, the round's final tile)", "1"],
  ["All Triplets", "3"],
  ["Half Flush (one suit + honors)", "3"],
  ["Seven Pairs", "4"],
  ["Small Three Dragons", "5"],
  ["Small Four Winds", "6"],
  ["Full Flush (one suit, no honors)", "7"],
  ["Terminals & Honors (only 1s, 9s, and honors)", "8"],
  ["Great Three Dragons", "8"],
  ["All Honors", "10"],
  ["Great Four Winds", "Limit (13)"],
  ["All Terminals (only 1s and 9s)", "Limit (13)"],
  ["Thirteen Orphans", "Limit (13)"],
];

/** The house rules, in one place, openable from the (?) button on the
 * homepage -- everything this app enforces, including the payment scheme
 * and niche bonuses, so friends joining a room can check how the table
 * plays without asking. */
export function RulesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="House rules"
        title="House rules"
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 text-sm font-bold text-slate-400 transition-colors hover:border-emerald-400 hover:text-emerald-600"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close rules"
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>

              <h2 className="text-center text-xl font-bold text-slate-900">House Rules</h2>
              <p className="mt-1 text-center text-xs text-slate-400">
                Hong Kong style, as played at this table
              </p>

              <div className="mt-5 space-y-5">
                <Section title="Seating & dealing">
                  <p>
                    Every round opens with a 3-dice roll. The dealer is always seat #1 (East) and
                    goes first with 14 tiles. To the dealer&apos;s right is #2 (South), across is
                    #3 (West), left is #4 (North). In online rooms you pick your own seat in the
                    lobby.
                  </p>
                  <p>
                    The dealer stays dealer after winning a round (or a drawn wall); otherwise
                    dealership passes to the next seat.
                  </p>
                </Section>

                <Section title="Table wind">
                  <p>
                    The game starts as the East round. Once every seat has had its turn as dealer,
                    the table wind advances: East → South → West → North. A triplet of your own
                    seat wind or the current table wind is worth 1 fan each.
                  </p>
                </Section>

                <Section title="Flowers & seasons">
                  <p>
                    Flower #1 is Spring &amp; Plum, #2 Summer &amp; Orchid, #3 Autumn &amp;
                    Chrysanthemum, #4 Winter &amp; Bamboo. Only your own position&apos;s flower or
                    season scores (+1 fan each, capped at 2) — the dealer&apos;s is always #1.
                    Flowers alone can never satisfy the win minimum.
                  </p>
                </Section>

                <Section title="Winning">
                  <p>
                    The table is set to a 0, 3, or 5 fan minimum at setup. Your hand pattern
                    (excluding flowers) must reach the minimum to declare a win. Kongs score no
                    fan by themselves, but winning on the kong replacement draw, robbing an added
                    kong, or taking the round&apos;s very last tile each add 1 fan.
                  </p>
                </Section>

                <Section title="Payments ($10 per fan)">
                  <p>
                    <strong>Self-draw:</strong> every other player pays the winner fan × $10 — a
                    9-fan self-draw collects $90 from each seat.
                  </p>
                  <p>
                    <strong>Win off a discard:</strong> only the player who fed the winning tile
                    pays fan × $10. Nobody else moves a cent.
                  </p>
                  <p>
                    Balances can go negative. Solo and online play keep separate balances.
                  </p>
                </Section>

                <Section title="Fan table">
                  <table className="w-full text-sm">
                    <tbody>
                      {FAN_TABLE.map(([hand, fan]) => (
                        <tr key={hand} className="border-t border-slate-100">
                          <td className="py-1.5 pr-2 text-slate-600">{hand}</td>
                          <td className="whitespace-nowrap py-1.5 text-right font-semibold text-emerald-700">
                            {fan}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-400">
                    Hands are scored under their most favorable reading; totals cap at the
                    13-fan limit.
                  </p>
                </Section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
