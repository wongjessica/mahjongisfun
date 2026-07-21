"use client";

import { Dispatch, ReactNode, createContext, useContext, useMemo, useReducer } from "react";
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
  /** Seat -> display name for every seat except this client's own. In solo
   * play these are bot names; online they're the other humans' chosen names
   * plus bot names -- same lookup either way, so seat-labelling UI never
   * cares which kind of opponent it's naming. */
  botNames: Record<number, string>;
  /** Seat -> chosen avatar emoji, for every seat occupied by a human who
   * picked one (bots keep their letter avatars). */
  icons: Record<number, string>;
  /** Seats THIS CLIENT'S bot AI is responsible for driving. Solo: every bot
   * seat. Online: empty for everyone except the acting host, who drives the
   * real bots plus any seat whose human has been gone past the takeover
   * grace period. */
  driveSeats: number[];
  /** Whether this client may advance to the next round / start a new match
   * (online: host only -- everyone else sees a waiting note instead). */
  canAdvanceRound: boolean;
  isOnline: boolean;
  /** True when this client is watching, not seated in the current round --
   * no hand is "yours" (humanSeat is -1) and nothing is interactive. */
  isSpectator?: boolean;
  /** The room's invite code, present only in online play -- lets in-game UI
   * offer an invite (code + QR) so a friend can join mid-match. */
  roomCode?: string;
}

const GameContext = createContext<GameContextValue | null>(null);

/** Low-level provider for callers that own their state/dispatch (online
 * play, where state is replayed from the shared action log and dispatch
 * appends to it). */
export function GameContextProvider({
  value,
  children,
}: {
  value: GameContextValue;
  children: ReactNode;
}) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Solo-play provider: local reducer, this client drives every bot seat. */
export function GameProvider({
  initialState,
  humanSeat,
  anonymousDiscards,
  speed,
  botNames,
  icons = {},
  children,
}: {
  initialState: GameState;
  humanSeat: number;
  anonymousDiscards: boolean;
  speed: GameSpeed;
  botNames: Record<number, string>;
  icons?: Record<number, string>;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(mahjongReducer, initialState);
  const driveSeats = useMemo(
    () => initialState.players.filter((p) => p.isBot).map((p) => p.seat),
    [initialState]
  );

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        humanSeat,
        anonymousDiscards,
        speed,
        botNames,
        icons,
        driveSeats,
        canAdvanceRound: true,
        isOnline: false,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
