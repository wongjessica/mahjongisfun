"use client";

import Link from "next/link";
import { useState } from "react";
import { GameProvider } from "@/components/game/GameContext";
import { useLang } from "@/components/i18n/LanguageContext";
import { assignBotNames } from "@/components/game/botNames";
import { BetaTable } from "@/components/beta/BetaTable";
import { RotatePrompt } from "@/components/beta/RotatePrompt";
import { SetupConfig, SetupForm } from "@/components/setup/SetupForm";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState, Wind } from "@/lib/mahjong/state";

const HUMAN_SEAT = 0;

type MatchConfig = Pick<SetupConfig, "fanMinimum" | "anonymousDiscards" | "speed" | "icon">;

/** The BETA "authentic table" experience -- a completely separate landscape
 * presentation over the SAME game engine, so it never touches the classic
 * UI. Solo vs bots for now. */
export default function BetaPage() {
  const { t } = useLang();
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
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
      icon: config.icon,
    });
    setBotNames(assignBotNames(HUMAN_SEAT));
    setGameKey((k) => k + 1);
  };

  const startNextRound = (
    nextDealerIndex: number,
    startingScores: [number, number, number, number],
    nextRoundWind: Wind
  ) => {
    if (!matchConfig) return;
    setInitialState(
      createInitialState({
        fanMinimum: matchConfig.fanMinimum,
        seed: Date.now(),
        humanSeat: HUMAN_SEAT,
        dealerIndex: nextDealerIndex,
        roundWind: nextRoundWind,
        startingScores,
      })
    );
    setGameKey((k) => k + 1);
  };

  if (!initialState || !matchConfig) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)] p-4">
        <div className="rounded-full border border-amber-400/40 bg-amber-950/30 px-4 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
          🧪 {t("beta.badge")}
        </div>
        <SetupForm onStart={startGame} />
        <Link href="/" className="text-xs font-medium text-emerald-200/70 underline hover:text-emerald-100">
          {t("beta.backClassic")}
        </Link>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full overflow-hidden bg-black">
      <RotatePrompt />
      <GameProvider
        key={gameKey}
        initialState={initialState}
        humanSeat={HUMAN_SEAT}
        anonymousDiscards={matchConfig.anonymousDiscards}
        speed={matchConfig.speed}
        botNames={botNames}
        icons={{ [HUMAN_SEAT]: matchConfig.icon }}
      >
        <BetaTable onNextRound={startNextRound} onNewMatch={() => setInitialState(null)} />
      </GameProvider>
    </main>
  );
}
