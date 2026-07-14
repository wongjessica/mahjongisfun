"use client";

import { Dispatch, ReactNode, createContext, useContext, useReducer } from "react";
import { GameAction } from "@/lib/mahjong/actions";
import { mahjongReducer } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";
import { GameSpeed } from "@/components/setup/SetupForm";

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  humanSeat: number;
  /** UI-only preferences (not part of the rules engine's GameState). */
  anonymousDiscards: boolean;
  speed: GameSpeed;
  /** Seat -> display name, for every bot seat (never the human's). Passed in
   * rather than generated here, since it must stay stable across rounds of
   * the same match, not just across this provider's own mount. */
  botNames: Record<number, string>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  initialState,
  humanSeat,
  anonymousDiscards,
  speed,
  botNames,
  children,
}: {
  initialState: GameState;
  humanSeat: number;
  anonymousDiscards: boolean;
  speed: GameSpeed;
  botNames: Record<number, string>;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(mahjongReducer, initialState);

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
