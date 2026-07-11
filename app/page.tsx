"use client";

import { useState } from "react";
import { GameBoard } from "@/components/board/GameBoard";
import { GameProvider } from "@/components/game/GameContext";
import { SetupConfig, SetupForm } from "@/components/setup/SetupForm";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";

const HUMAN_SEAT = 0;

export default function Home() {
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const startGame = (config: SetupConfig) => {
    setInitialState(createInitialState({ ...config, humanSeat: HUMAN_SEAT }));
    setGameKey((key) => key + 1);
  };

  if (!initialState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)] p-4">
        <SetupForm onStart={startGame} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)] py-6">
      <GameProvider key={gameKey} initialState={initialState} humanSeat={HUMAN_SEAT}>
        <GameBoard onNewGame={() => setInitialState(null)} />
      </GameProvider>
    </main>
  );
}
