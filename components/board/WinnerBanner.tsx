"use client";

import { motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { LabeledTile } from "@/components/tiles/LabeledTile";
import { Meld } from "@/lib/mahjong/melds";
import { WinResult, nextSeat } from "@/lib/mahjong/state";
import { sortTiles } from "@/lib/mahjong/tiles";

function MeldCluster({ meld }: { meld: Meld }) {
  return (
    <div className="flex gap-0.5 rounded-md bg-black/5 p-1">
      {meld.tiles.map((tile) => (
        <LabeledTile key={tile.id} tile={tile} size="sm" animateIn={false} />
      ))}
    </div>
  );
}

/** Full reveal of a winning hand -- every tile, exactly as it looked at the
 * moment of winning, so the fan total can actually be checked against the
 * tiles rather than taken on faith (this matters most for a bot's win,
 * since a bot's hand is otherwise always hidden). */
export function WinnerHand({ winner }: { winner: WinResult }) {
  const { concealedTiles, melds } = winner.revealedHand;

  return (
    <div className="flex flex-wrap items-start justify-center gap-1.5 rounded-lg bg-white/60 p-2">
      {melds.map((meld, i) => (
        <MeldCluster key={`${meld.type}-${i}-${meld.tiles[0]?.id}`} meld={meld} />
      ))}
      {sortTiles(concealedTiles).map((tile) => (
        <LabeledTile
          key={tile.id}
          tile={tile}
          size="sm"
          animateIn={false}
          highlight={tile.id === winner.wonTile.id}
        />
      ))}
    </div>
  );
}

interface RoundEndOverlayProps {
  onNextRound: (nextDealerIndex: number, startingScores: [number, number, number, number]) => void;
  onNewMatch: () => void;
  /** Dismisses the overlay without advancing the round, so the board behind
   * it (all hands revealed, full discard piles) can be inspected as a
   * post-mortem. GameBoard keeps track of the dismissal and offers a way
   * back in, since Next Round/New Match still need to happen eventually. */
  onDismiss: () => void;
}

/** Shown as a centered overlay (like the dice roll), not inline in the page
 * flow -- an inline banner would shove the human's hand and action bar
 * further down the page every time a round ends, which is exactly the kind
 * of layout shuffling that makes the board feel cramped. */
export function RoundEndOverlay({ onNextRound, onNewMatch, onDismiss }: RoundEndOverlayProps) {
  const { state, humanSeat, botNames, canAdvanceRound, isOnline } = useGame();

  const winnerName = (seat: number) => (seat === humanSeat ? "You" : botNames[seat]);
  const staysVerb = (seat: number) => (seat === humanSeat ? "stay" : "stays");

  const dealerRepeats =
    state.isDraw || (state.winners?.some((w) => w.seat === state.dealerIndex) ?? false);
  const nextDealerIndex = dealerRepeats ? state.dealerIndex : nextSeat(state.dealerIndex);
  const startingScores = state.players.map((p) => p.score) as [number, number, number, number];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 p-4 text-center shadow-2xl"
      >
        <button
          onClick={onDismiss}
          aria-label="Close and view the board"
          title="Close and view the board"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-amber-700 transition-colors hover:bg-amber-900/10 hover:text-amber-900"
        >
          ✕
        </button>
        {state.isDraw ? (
          <p className="font-semibold text-amber-900">Wall exhausted — no winner this round.</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {state.winners?.map((winner) => (
              <div key={winner.seat} className="flex flex-col items-center gap-2">
                <div>
                  <p className="font-bold text-amber-900">
                    {winnerName(winner.seat)} won with {winner.fan} fan
                    {winner.selfDraw ? " (self-draw)" : ""}
                  </p>
                  <p className="text-xs text-amber-700">
                    {winner.breakdown.map((b) => `${b.label} (${b.fan})`).join(" · ")}
                  </p>
                </div>
                <WinnerHand winner={winner} />
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-amber-700">
          {dealerRepeats
            ? `${winnerName(state.dealerIndex)} ${staysVerb(state.dealerIndex)} dealer next round.`
            : `Dealership passes to ${winnerName(nextSeat(state.dealerIndex))}.`}
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          {canAdvanceRound ? (
            <button
              onClick={() => onNextRound(nextDealerIndex, startingScores)}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.97]"
            >
              Next Round
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-amber-600"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              Waiting for the host to start the next round…
            </span>
          )}
          <button
            onClick={onNewMatch}
            className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
          >
            {isOnline ? "Leave room" : "New match / change settings"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
