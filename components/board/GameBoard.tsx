"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/components/game/GameContext";
import { useBotDriver } from "@/components/game/useBotDriver";
import { useHumanAutoDraw } from "@/components/game/useHumanAutoDraw";
import { toGameAction } from "@/lib/mahjong/actions";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { nextSeat } from "@/lib/mahjong/state";
import { ActionBar } from "./ActionBar";
import { CenterTable } from "./CenterTable";
import { DiceRoll } from "./DiceRoll";
import { DiscardBoard } from "./DiscardBoard";
import { PlayerPanel } from "./PlayerPanel";
import { RoundEndOverlay } from "./WinnerBanner";

interface GameBoardProps {
  /** Continues the match: same ruleset/settings, dealer and scores carry
   * forward per the rotation rule (computed in RoundEndOverlay, which has
   * the ended round's state). */
  onNextRound: (nextDealerIndex: number, startingScores: [number, number, number, number]) => void;
  /** Full reset: back to the setup screen, dealer/scores start fresh. */
  onNewMatch: () => void;
}

export function GameBoard({ onNextRound, onNewMatch }: GameBoardProps) {
  // Every fresh mount (a new match or a rotated-dealer "Next Round") starts
  // with its own dice roll, which pauses bot/auto-draw underneath it so
  // nothing plays out invisibly behind the animation.
  const [rollingDice, setRollingDice] = useState(true);
  const thinkingSeat = useBotDriver(rollingDice);
  useHumanAutoDraw(rollingDice);
  const { state, dispatch, humanSeat } = useGame();
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 p-2 sm:h-full sm:overflow-hidden sm:p-3">
      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-[1.1fr_0.9fr_1.1fr] sm:items-start">
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

      <div className="min-h-0 sm:flex-1">
        <DiscardBoard />
      </div>

      <div className="shrink-0">
        <PlayerPanel
          seat={humanSeat}
          isHuman
          selectedTileId={selectedTileId}
          onSelectTile={(tileId) => setSelectedTileId((prev) => (prev === tileId ? null : tileId))}
          onDiscardTile={handleDiscardTile}
          handSize="md"
        />
      </div>

      <div className="shrink-0">
        <ActionBar selectedTileId={selectedTileId} onConsumeSelection={() => setSelectedTileId(null)} />
      </div>

      <AnimatePresence>
        {rollingDice && <DiceRoll onDone={() => setRollingDice(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {!rollingDice && state.turn.phase === "round-ended" && (
          <RoundEndOverlay onNextRound={onNextRound} onNewMatch={onNewMatch} />
        )}
      </AnimatePresence>
    </div>
  );
}
