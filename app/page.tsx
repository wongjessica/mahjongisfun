"use client";

import { useState } from "react";
import { GameBoard } from "@/components/board/GameBoard";
import { GameProvider } from "@/components/game/GameContext";
import { assignBotNames } from "@/components/game/botNames";
import { SetupConfig, SetupForm } from "@/components/setup/SetupForm";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";

const HUMAN_SEAT = 0;

type MatchConfig = Pick<SetupConfig, "fanMinimum" | "anonymousDiscards" | "speed">;

export default function Home() {
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
  // Generated once per match (not per round), so bots keep the same name
  // across "Next Round" transitions -- only a full "New Match" reshuffles it.
  const [botNames, setBotNames] = useState<Record<number, string>>({});
  const [gameKey, setGameKey] = useState(0);

  const startGame = (config: SetupConfig) => {
    setInitialState(
      createInitialState({ fanMinimum: config.fanMinimum, seed: config.seed, humanSeat: HUMAN_SEAT })
    );
    setMatchConfig({
      fanMinimum: config.fanMinimum,
      anonymousDiscards: config.anonymousDiscards,
      speed: config.speed,
    });
    setBotNames(assignBotNames(HUMAN_SEAT));
    setGameKey((key) => key + 1);
  };

  // Continues the same match: same ruleset/settings, but the dealer and
  // scores carry forward per the outcome of the round that just ended
  // (computed by GameBoard, which has the ended state).
  const startNextRound = (nextDealerIndex: number, startingScores: [number, number, number, number]) => {
    if (!matchConfig) return;
    setInitialState(
      createInitialState({
        fanMinimum: matchConfig.fanMinimum,
        seed: Date.now(),
        humanSeat: HUMAN_SEAT,
        dealerIndex: nextDealerIndex,
        startingScores,
      })
    );
    setGameKey((key) => key + 1);
  };

  if (!initialState || !matchConfig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)] p-4">
        <SetupForm onStart={startGame} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)]">
      <GameProvider
        key={gameKey}
        initialState={initialState}
        humanSeat={HUMAN_SEAT}
        anonymousDiscards={matchConfig.anonymousDiscards}
        speed={matchConfig.speed}
        botNames={botNames}
      >
        <GameBoard onNextRound={startNextRound} onNewMatch={() => setInitialState(null)} />
      </GameProvider>
    </main>
  );
}
