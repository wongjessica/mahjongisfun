"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/components/game/GameContext";
import { useBotDriver } from "@/components/game/useBotDriver";
import { useHumanAutoDraw } from "@/components/game/useHumanAutoDraw";
import { toGameAction } from "@/lib/mahjong/actions";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { nextSeat } from "@/lib/mahjong/state";
import { ActionBar } from "./ActionBar";
import { CenterTable } from "./CenterTable";
import { DiscardBoard } from "./DiscardBoard";
import { PlayerPanel } from "./PlayerPanel";
import { WinnerHand } from "./WinnerBanner";

interface GameBoardProps {
  /** Continues the match: same ruleset/settings, dealer and scores carry
   * forward per the rotation rule (computed here, since that needs the
   * ended round's state). */
  onNextRound: (nextDealerIndex: number, startingScores: [number, number, number, number]) => void;
  /** Full reset: back to the setup screen, dealer/scores start fresh. */
  onNewMatch: () => void;
}

export function GameBoard({ onNextRound, onNewMatch }: GameBoardProps) {
  const thinkingSeat = useBotDriver();
  useHumanAutoDraw();
  const { state, dispatch, humanSeat, botNames } = useGame();
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  // Auto-select the tile you just drew -- discarding it (the common case)
  // is then a single tap, instead of having to select it first.
  useEffect(() => {
    if (state.lastDraw && state.lastDraw.seat === humanSeat) {
      setSelectedTileId(state.lastDraw.tile.id);
    }
  }, [state.lastDraw, humanSeat]);

  const rightSeat = nextSeat(humanSeat);
  const topSeat = nextSeat(rightSeat);
  const leftSeat = nextSeat(topSeat);

  // Double-clicking a hand tile discards it directly, skipping the
  // select-then-tap-Discard step, when that's actually a legal move.
  const handleDiscardTile = (tileId: string) => {
    const discardAction = getLegalActions(state, humanSeat).find(
      (a) => a.type === "DISCARD" && a.tileId === tileId
    );
    if (discardAction) {
      dispatch(toGameAction(discardAction, humanSeat));
      setSelectedTileId(null);
    }
  };

  const winnerName = (seat: number) => (seat === humanSeat ? "You" : botNames[seat]);

  // Dealer repeats if they won (or the round drew); otherwise dealership
  // passes to the next seat in turn order.
  const dealerRepeats = state.isDraw || (state.winners?.some((w) => w.seat === state.dealerIndex) ?? false);
  const nextDealerIndex = dealerRepeats ? state.dealerIndex : nextSeat(state.dealerIndex);
  const startingScores = state.players.map((p) => p.score) as [number, number, number, number];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.1fr_0.9fr_1.1fr] sm:items-start">
        <div className="order-3 sm:order-1">
          <PlayerPanel
            seat={leftSeat}
            isHuman={false}
            isThinking={thinkingSeat === leftSeat}
            position="left"
          />
        </div>

        <div className="order-1 flex flex-col gap-2 sm:order-2">
          <PlayerPanel
            seat={topSeat}
            isHuman={false}
            isThinking={thinkingSeat === topSeat}
            position="across"
          />
          <CenterTable />
        </div>

        <div className="order-4 sm:order-3">
          <PlayerPanel
            seat={rightSeat}
            isHuman={false}
            isThinking={thinkingSeat === rightSeat}
            position="right"
          />
        </div>
      </div>

      <DiscardBoard />

      <AnimatePresence>
        {state.turn.phase === "round-ended" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 p-4 text-center shadow-lg"
          >
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
                ? `${winnerName(state.dealerIndex)} stays dealer next round.`
                : `Dealership passes to ${winnerName(nextSeat(state.dealerIndex))}.`}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => onNextRound(nextDealerIndex, startingScores)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.97]"
              >
                Next Round
              </button>
              <button
                onClick={onNewMatch}
                className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
              >
                New match / change settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerPanel
        seat={humanSeat}
        isHuman
        selectedTileId={selectedTileId}
        onSelectTile={(tileId) => setSelectedTileId((prev) => (prev === tileId ? null : tileId))}
        onDiscardTile={handleDiscardTile}
        handSize="lg"
      />

      <ActionBar selectedTileId={selectedTileId} onConsumeSelection={() => setSelectedTileId(null)} />
    </div>
  );
}
