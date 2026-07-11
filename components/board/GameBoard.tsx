"use client";

import { useState } from "react";
import { useGame } from "@/components/game/GameContext";
import { useBotDriver } from "@/components/game/useBotDriver";
import { ActionBar } from "./ActionBar";
import { PlayerPanel } from "./PlayerPanel";
import { WallCounter } from "./WallCounter";

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };

export function GameBoard({ onNewGame }: { onNewGame: () => void }) {
  useBotDriver();
  const { state, humanSeat } = useGame();
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  const opponentSeats = [0, 1, 2, 3].filter((seat) => seat !== humanSeat);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {opponentSeats.map((seat) => (
          <PlayerPanel key={seat} seat={seat} isHuman={false} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 rounded-lg bg-gray-800 py-3 text-white">
        <WallCounter state={state} />
        <div className="text-sm">
          Round Wind: {WIND_NAMES[state.roundWind]} · {state.ruleset.fanMinimum}-fan minimum
        </div>
      </div>

      {state.turn.phase === "round-ended" && (
        <div className="rounded-lg border border-emerald-400 bg-emerald-50 p-4 text-center">
          {state.isDraw ? (
            <p className="font-semibold text-emerald-800">Wall exhausted — no winner this round.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {state.winners?.map((winner) => (
                <p key={winner.seat} className="font-semibold text-emerald-800">
                  {winner.seat === humanSeat ? "You" : `Bot ${winner.seat}`} won with {winner.fan} fan
                  {" "}({winner.breakdown.map((b) => b.label).join(", ")})
                </p>
              ))}
            </div>
          )}
          <button
            onClick={onNewGame}
            className="mt-3 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
          >
            New Game
          </button>
        </div>
      )}

      <PlayerPanel
        seat={humanSeat}
        isHuman
        selectedTileId={selectedTileId}
        onSelectTile={(tileId) => setSelectedTileId((prev) => (prev === tileId ? null : tileId))}
      />

      <ActionBar selectedTileId={selectedTileId} onConsumeSelection={() => setSelectedTileId(null)} />
    </div>
  );
}
