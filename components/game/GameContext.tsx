"use client";

import { Dispatch, ReactNode, createContext, useContext, useReducer, useState } from "react";
import { GameAction } from "@/lib/mahjong/actions";
import { mahjongReducer } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";
import { GameSpeed } from "@/components/setup/SetupForm";
import { assignBotNames } from "./botNames";

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  humanSeat: number;
  /** UI-only preferences (not part of the rules engine's GameState). */
  anonymousDiscards: boolean;
  speed: GameSpeed;
  /** Seat -> display name, for every bot seat (never the human's). */
  botNames: Record<number, string>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  initialState,
  humanSeat,
  anonymousDiscards,
  speed,
  children,
}: {
  initialState: GameState;
  humanSeat: number;
  anonymousDiscards: boolean;
  speed: GameSpeed;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(mahjongReducer, initialState);
  // Lazy initializer: computed once when this provider mounts (a new game
  // remounts it via a fresh `key`), stable for the whole round.
  const [botNames] = useState(() => assignBotNames(humanSeat));

  return (
    <GameContext.Provider value={{ state, dispatch, humanSeat, anonymousDiscards, speed, botNames }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
