"use client";

import { useEffect, useRef } from "react";
import { toGameAction } from "@/lib/mahjong/actions";
import { intermediateStrategy } from "@/lib/mahjong/bot/intermediateStrategy";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";
import { useGame } from "./GameContext";

const BOT_DELAY_MS = { fast: 120, slow: 550 } as const;

/** The bot seat (if any) that currently has an action pending -- the same
 * seat useBotDriver is about to act for. Exposed so the UI can show a
 * "thinking" indicator on that seat's panel. */
export function getPendingBotSeat(state: GameState, humanSeat: number): number | null {
  if (state.turn.phase === "round-ended") return null;
  for (let seat = 0; seat < 4; seat++) {
    if (seat === humanSeat || !state.players[seat].isBot) continue;
    if (getLegalActions(state, seat).length > 0) return seat;
  }
  return null;
}

/** Watches game state and, whenever it's a bot's turn to act in any phase
 * (draw, discard, or a call-response window), dispatches its choice after a
 * short cosmetic delay. The reducer's call-window logic tolerates
 * out-of-order responses, so this timing never affects correctness -- it
 * only exists so bot moves don't feel instantaneous.
 *
 * Returns the seat currently "thinking" (or null) for a UI indicator.
 * Pass `paused` while a non-interactive intro (e.g. the dice-roll reveal)
 * is covering the board, so bots don't play out several turns invisibly
 * behind it. */
export function useBotDriver(paused = false): number | null {
  const { state, dispatch, humanSeat, speed } = useGame();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeat = paused ? null : getPendingBotSeat(state, humanSeat);

  useEffect(() => {
    if (pendingSeat === null) return undefined;

    const legal = getLegalActions(state, pendingSeat);
    timeoutRef.current = setTimeout(() => {
      const chosen = intermediateStrategy.chooseAction(state, pendingSeat, legal);
      dispatch(toGameAction(chosen, pendingSeat));
    }, BOT_DELAY_MS[speed]);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, dispatch, pendingSeat, speed]);

  return pendingSeat;
}
