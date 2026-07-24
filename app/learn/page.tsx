"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameBoard } from "@/components/board/GameBoard";
import { GameProvider } from "@/components/game/GameContext";
import { assignBotNames } from "@/components/game/botNames";
import { LessonView } from "@/components/tutorial/LessonView";
import { TutorialCoach } from "@/components/tutorial/TutorialCoach";
import { TutorialPostmortem } from "@/components/tutorial/TutorialPostmortem";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState, Wind } from "@/lib/mahjong/state";
import { markTutorialComplete } from "@/lib/tutorial/progress";

const HUMAN_SEAT = 0;

type Stage = "intro" | "lessons" | "practice";

/** The guided "Learn to Play" flow: a friendly intro, the scripted lessons,
 * then a real coached game vs bots. Runs over the same engine as the main
 * app -- the practice game IS the classic board, with a coach riding along
 * and the fan-minimum dropped to 0 so any complete hand can win. */
export default function LearnPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const [botNames, setBotNames] = useState<Record<number, string>>({});
  const [gameKey, setGameKey] = useState(0);

  const beginPractice = () => {
    markTutorialComplete();
    setInitialState(createInitialState({ fanMinimum: 0, seed: Date.now(), humanSeat: HUMAN_SEAT }));
    setBotNames(assignBotNames(HUMAN_SEAT));
    setGameKey((k) => k + 1);
    setStage("practice");
  };

  const startNextRound = (
    nextDealerIndex: number,
    startingScores: [number, number, number, number],
    nextRoundWind: Wind
  ) => {
    setInitialState(
      createInitialState({
        fanMinimum: 0,
        seed: Date.now(),
        humanSeat: HUMAN_SEAT,
        dealerIndex: nextDealerIndex,
        roundWind: nextRoundWind,
        startingScores,
      })
    );
    setGameKey((k) => k + 1);
  };

  if (stage === "lessons") {
    return <LessonView onFinishAll={beginPractice} onExit={() => setStage("intro")} />;
  }

  if (stage === "practice" && initialState) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)]">
        {/* Always-visible escape hatch: at z-50 it sits above the round-end
            overlay (z-40) too, so a player who already knows how to play is
            never stuck in the tutorial -- one tap drops them into the real app. */}
        <button
          onClick={() => router.push("/")}
          className="fixed left-2 top-2 z-50 rounded-full border border-emerald-300/50 bg-emerald-950/70 px-3 py-1.5 text-xs font-semibold text-emerald-100 shadow-lg backdrop-blur hover:bg-emerald-900/80"
        >
          ✕ Exit to full game
        </button>
        <GameProvider
          key={gameKey}
          initialState={initialState}
          humanSeat={HUMAN_SEAT}
          anonymousDiscards={false}
          speed="slow"
          botNames={botNames}
          icons={{ [HUMAN_SEAT]: "🎓" }}
        >
          <TutorialCoach />
          <TutorialPostmortem />
          <GameBoard onNextRound={startNextRound} onNewMatch={() => router.push("/")} />
        </GameProvider>
      </main>
    );
  }

  // Intro
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-gradient-to-b from-emerald-50 to-white p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
        <span className="text-5xl">🀄</span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-emerald-950">Learn to Play</h1>
          <p className="text-[15px] leading-relaxed text-gray-600">
            Never played Hong Kong mahjong? This short tutorial teaches you everything — the tiles,
            how to build a hand, claiming tiles, and how scoring works. Then you&apos;ll play a real
            game against bots with a coach guiding every move.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <button
            onClick={() => setStage("lessons")}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            Start the tutorial →
          </button>
          <button
            onClick={beginPractice}
            className="w-full rounded-xl border border-emerald-200 px-6 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Skip to a coached practice game
          </button>
        </div>
        <Link href="/" className="text-xs font-medium text-gray-400 hover:text-gray-600">
          ← Back to the app
        </Link>
      </div>
    </main>
  );
}
