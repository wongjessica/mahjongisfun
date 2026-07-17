"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/game/GameContext";
import { useBotDriver } from "@/components/game/useBotDriver";
import { useHumanAutoDraw } from "@/components/game/useHumanAutoDraw";
import { toGameAction } from "@/lib/mahjong/actions";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { Wind, nextSeat } from "@/lib/mahjong/state";
import { addEarnings, earningsForRound } from "@/lib/wallet";
import { ActionBar } from "./ActionBar";
import { CenterTable } from "./CenterTable";
import { fireWinConfetti } from "./confetti";
import { DiceRoll } from "./DiceRoll";
import { DiscardBoard } from "./DiscardBoard";
import { PlayerPanel } from "./PlayerPanel";
import { RoundEndOverlay } from "./WinnerBanner";

interface GameBoardProps {
  /** Continues the match: same ruleset/settings, dealer and scores carry
   * forward per the rotation rule (computed in RoundEndOverlay, which has
   * the ended round's state). */
  onNextRound: (
    nextDealerIndex: number,
    startingScores: [number, number, number, number],
    nextRoundWind: Wind
  ) => void;
  /** Full reset: back to the setup screen, dealer/scores start fresh.
   * (Online: leaves the room.) */
  onNewMatch: () => void;
  /** Shared per-round seed so all online players see the same dice roll;
   * omit for solo play's genuinely random dice. */
  diceSeed?: number;
}

export function GameBoard({ onNextRound, onNewMatch, diceSeed }: GameBoardProps) {
  // Every fresh mount (a new match or a rotated-dealer "Next Round") starts
  // with its own dice roll, which pauses bot/auto-draw underneath it so
  // nothing plays out invisibly behind the animation.
  const [rollingDice, setRollingDice] = useState(true);
  const thinkingSeat = useBotDriver(rollingDice);
  useHumanAutoDraw(rollingDice);
  const { state, dispatch, humanSeat, isOnline } = useGame();
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  // Closing the round-end overlay just hides it -- the round is still over
  // (Next Round/New Match haven't happened) -- so the board can be inspected
  // as a post-mortem (every hand is revealed once a round ends) without
  // losing the ability to jump back into the results and continue.
  const [resultsOpen, setResultsOpen] = useState(true);

  // Fire once per round, the moment the human's win becomes visible --
  // guarded by a ref (not state) so re-opening the dismissed results
  // overlay via "View Results" doesn't retrigger it.
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (rollingDice || state.turn.phase !== "round-ended" || confettiFiredRef.current) return;
    if (!state.winners?.some((w) => w.seat === humanSeat)) return;
    confettiFiredRef.current = true;
    fireWinConfetti();
  }, [rollingDice, state.turn.phase, state.winners, humanSeat]);

  // Credit the play-money wallet exactly once per finished round (same
  // once-per-round ref discipline as the confetti). Solo and online play
  // pay into separate balances.
  const walletCreditedRef = useRef(false);
  useEffect(() => {
    if (state.turn.phase !== "round-ended" || walletCreditedRef.current) return;
    walletCreditedRef.current = true;
    addEarnings(isOnline ? "online" : "solo", earningsForRound(state, humanSeat));
  }, [state, humanSeat, isOnline]);

  // Auto-select the tile you just drew -- discarding it (the common case)
  // is then a single tap, instead of having to select it first. Guarded by
  // the drawn tile's ID (not the lastDraw object), and fired at most once
  // per distinct draw: in online play every remote action rebuilds state
  // from the action log, so lastDraw gets a fresh object identity
  // constantly -- re-running on identity would keep yanking the selection
  // back to the drawn tile after the player deliberately picked another
  // (the "I selected a tile, waited, and it discarded the wrong one" bug).
  const drawnTileId = state.lastDraw?.seat === humanSeat ? state.lastDraw.tile.id : null;
  const autoSelectedDrawRef = useRef<string | null>(null);
  useEffect(() => {
    if (drawnTileId && drawnTileId !== autoSelectedDrawRef.current) {
      autoSelectedDrawRef.current = drawnTileId;
      setSelectedTileId(drawnTileId);
    }
  }, [drawnTileId]);

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5 p-2 sm:p-2.5">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1.1fr_0.9fr_1.1fr] sm:items-start">
        <div className="order-3 sm:order-1">
          <PlayerPanel
            seat={leftSeat}
            isHuman={false}
            isThinking={thinkingSeat === leftSeat}
            position="left"
          />
        </div>

        <div className="order-1 flex flex-col gap-1.5 sm:order-2">
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

      <PlayerPanel
        seat={humanSeat}
        isHuman
        selectedTileId={selectedTileId}
        onSelectTile={(tileId) => setSelectedTileId((prev) => (prev === tileId ? null : tileId))}
        onDiscardTile={handleDiscardTile}
        handSize="md"
      />

      <ActionBar selectedTileId={selectedTileId} onConsumeSelection={() => setSelectedTileId(null)} />

      <AnimatePresence>
        {rollingDice && <DiceRoll onDone={() => setRollingDice(false)} seed={diceSeed} />}
      </AnimatePresence>

      <AnimatePresence>
        {!rollingDice && state.turn.phase === "round-ended" && resultsOpen && (
          <RoundEndOverlay
            onNextRound={onNextRound}
            onNewMatch={onNewMatch}
            onDismiss={() => setResultsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!rollingDice && state.turn.phase === "round-ended" && !resultsOpen && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => setResultsOpen(true)}
            className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-xl hover:from-amber-100 hover:to-yellow-200"
          >
            🏆 View Results
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
