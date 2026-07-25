"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GameBoard } from "@/components/board/GameBoard";
import { GameProvider } from "@/components/game/GameContext";
import { useLang } from "@/components/i18n/LanguageContext";
import { assignBotNames } from "@/components/game/botNames";
import { OnlineFlow } from "@/components/online/OnlineFlow";
import { SetupConfig, SetupForm } from "@/components/setup/SetupForm";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState, Wind } from "@/lib/mahjong/state";

const HUMAN_SEAT = 0;

type MatchConfig = Pick<SetupConfig, "fanMinimum" | "anonymousDiscards" | "speed" | "icon">;

export default function Home() {
  const { t } = useLang();
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
  const [mode, setMode] = useState<"solo" | "online">("solo");
  // An invite link (?room=CODE) drops the visitor straight into the online
  // join screen with the code prefilled.
  const [inviteCode, setInviteCode] = useState<string | undefined>(undefined);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("room");
    if (fromUrl) {
      setInviteCode(fromUrl);
      setMode("online");
    }
  }, []);
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
      icon: config.icon,
    });
    setBotNames(assignBotNames(HUMAN_SEAT));
    setGameKey((key) => key + 1);
  };

  // Continues the same match: same ruleset/settings, but the dealer, table
  // wind, and scores carry forward per the outcome of the round that just
  // ended (computed by GameBoard, which has the ended state).
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
    setGameKey((key) => key + 1);
  };

  if (mode === "online") {
    return <OnlineFlow initialRoomCode={inviteCode} onBack={() => setMode("solo")} />;
  }

  if (!initialState || !matchConfig) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_top,_#1e3a2f,_#0f1f19)] p-4">
        <Link
          href="/learn"
          className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-emerald-300/50 bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 px-5 py-3 text-left transition-colors hover:from-emerald-500/30 hover:to-emerald-700/30"
        >
          <span className="text-2xl">🀄</span>
          <span className="flex flex-col">
            <span className="text-sm font-bold text-emerald-100">{t("home.learn.title")}</span>
            <span className="text-xs text-emerald-200/70">{t("home.learn.subtitle")}</span>
          </span>
          <span className="ml-auto text-emerald-200/70">→</span>
        </Link>
        <SetupForm onStart={startGame} onPlayOnline={() => setMode("online")} />
        <Link
          href="/beta"
          className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-950/30 px-4 py-2 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-900/40"
        >
          🧪 {t("home.beta")} <span className="text-xs font-normal text-amber-200/70">{t("home.beta.tag")}</span>
        </Link>
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
        icons={{ [HUMAN_SEAT]: matchConfig.icon }}
      >
        <GameBoard onNextRound={startNextRound} onNewMatch={() => setInitialState(null)} />
      </GameProvider>
    </main>
  );
}
