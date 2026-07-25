"use client";

import { useEffect, useRef } from "react";
import { toGameAction } from "@/lib/mahjong/actions";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { useGame } from "./GameContext";

const AUTO_DRAW_DELAY_MS = { fast: 60, slow: 200, learn: 350 } as const;

/** Drawing (and revealing/replacing a flower) isn't a real decision in
 * mahjong -- you always do it on your turn, there's no choice involved.
 * Auto-dispatch it for the human so they don't have to click a button for a
 * non-choice. DISCARD, DECLARE_WIN, and CALL_* stay manual: those are the
 * actual decisions. Pass `paused` while a non-interactive intro (e.g. the
 * dice-roll reveal) is covering the board. */
export function useHumanAutoDraw(paused = false) {
  const { state, dispatch, humanSeat, speed } = useGame();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return undefined;
    const legal = getLegalActions(state, humanSeat);
    const isForcedDraw =
      legal.length === 1 && (legal[0].type === "DRAW" || legal[0].type === "REPLACE_FLOWER");
    if (!isForcedDraw) return undefined;

    const action = legal[0];
    timeoutRef.current = setTimeout(() => {
      dispatch(toGameAction(action, humanSeat));
    }, AUTO_DRAW_DELAY_MS[speed]);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, dispatch, humanSeat, speed, paused]);
}
