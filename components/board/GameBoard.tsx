"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/components/game/GameContext";
import { useBotDriver } from "@/components/game/useBotDriver";
import { useHumanAutoDraw } from "@/components/game/useHumanAutoDraw";
import { nextSeat } from "@/lib/mahjong/state";
import { ActionBar } from "./ActionBar";
import { CenterTable } from "./CenterTable";
import { DiscardBoard } from "./DiscardBoard";
import { PlayerPanel } from "./PlayerPanel";
import { WinnerHand } from "./WinnerBanner";

export function GameBoard({ onNewGame }: { onNewGame: () => void }) {
  const thinkingSeat = useBotDriver();
  useHumanAutoDraw();
  const { state, humanSeat } = useGame();
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.1fr_0.9fr_1.1fr] sm:items-start">
        <div className="order-3 sm:order-1">
          <PlayerPanel seat={leftSeat} isHuman={false} isThinking={thinkingSeat === leftSeat} />
        </div>

        <div className="order-1 flex flex-col gap-2 sm:order-2">
          <PlayerPanel seat={topSeat} isHuman={false} isThinking={thinkingSeat === topSeat} />
          <CenterTable />
        </div>

        <div className="order-4 sm:order-3">
          <PlayerPanel seat={rightSeat} isHuman={false} isThinking={thinkingSeat === rightSeat} />
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
                        {winner.seat === humanSeat ? "You" : "Bot"} won with {winner.fan} fan
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
            <button
              onClick={onNewGame}
              className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.97]"
            >
              New Game
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerPanel
        seat={humanSeat}
        isHuman
        selectedTileId={selectedTileId}
        onSelectTile={(tileId) => setSelectedTileId((prev) => (prev === tileId ? null : tileId))}
        handSize="lg"
      />

      <ActionBar selectedTileId={selectedTileId} onConsumeSelection={() => setSelectedTileId(null)} />
    </div>
  );
}
