"use client";

import { useEffect, useRef } from "react";
import { toGameAction } from "@/lib/mahjong/actions";
import { intermediateStrategy } from "@/lib/mahjong/bot/intermediateStrategy";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { useGame } from "./GameContext";

const BOT_DELAY_MS = 550;

/** Watches game state and, whenever it's a bot's turn to act in any phase
 * (draw, discard, or a call-response window), dispatches its choice after a
 * short cosmetic delay. The reducer's call-window logic tolerates
 * out-of-order responses, so this timing never affects correctness -- it
 * only exists so bot moves don't feel instantaneous. */
export function useBotDriver() {
  const { state, dispatch, humanSeat } = useGame();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.turn.phase === "round-ended") return undefined;

    for (let seat = 0; seat < 4; seat++) {
      if (seat === humanSeat || !state.players[seat].isBot) continue;
      const legal = getLegalActions(state, seat);
      if (legal.length === 0) continue;

      timeoutRef.current = setTimeout(() => {
        const chosen = intermediateStrategy.chooseAction(state, seat, legal);
        dispatch(toGameAction(chosen, seat));
      }, BOT_DELAY_MS);
      break;
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, dispatch, humanSeat]);
}
