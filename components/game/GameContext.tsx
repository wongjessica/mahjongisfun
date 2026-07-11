"use client";

import { Dispatch, ReactNode, createContext, useContext, useReducer } from "react";
import { GameAction } from "@/lib/mahjong/actions";
import { mahjongReducer } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  humanSeat: number;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  initialState,
  humanSeat,
  children,
}: {
  initialState: GameState;
  humanSeat: number;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(mahjongReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch, humanSeat }}>{children}</GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
