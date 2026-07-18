"use client";

import { useEffect, useRef } from "react";
import { GameState } from "@/lib/mahjong/state";
import { cue, playSound } from "@/lib/sound";

/** Maps game-state changes to sound + haptic cues. Each cue fires once per
 * event via a ref guard (the same discipline the confetti/wallet effects
 * use), so re-renders -- constant in online replay -- never re-trigger a
 * sound. */
export function useGameSounds(state: GameState, humanSeat: number, rollingDice: boolean) {
  const lastDiscardId = useRef<string | null>(null);
  const lastDrawId = useRef<string | null>(null);
  const meldCount = useRef<number>(totalMelds(state));
  const wasMyTurn = useRef(false);
  const winFired = useRef(false);

  // A tile hitting the table -- any player's discard.
  useEffect(() => {
    const id = state.lastDiscard?.tile.id ?? null;
    if (id && id !== lastDiscardId.current) playSound("discard");
    lastDiscardId.current = id;
  }, [state.lastDiscard]);

  // Your own draw off the wall -- a soft tick.
  useEffect(() => {
    const id = state.lastDraw?.seat === humanSeat ? state.lastDraw.tile.id : null;
    if (id && id !== lastDrawId.current) playSound("draw");
    lastDrawId.current = id;
  }, [state.lastDraw, humanSeat]);

  // Someone called pon/chi/kong (a meld appeared).
  useEffect(() => {
    const total = totalMelds(state);
    if (total > meldCount.current) playSound("call");
    meldCount.current = total;
  }, [state]);

  // Your turn to make a real decision -- a soft prompt + a buzz.
  useEffect(() => {
    if (rollingDice || state.turn.phase === "round-ended") {
      wasMyTurn.current = false;
      return;
    }
    const myTurn =
      state.turn.activeSeat === humanSeat && state.turn.phase === "awaiting-discard";
    if (myTurn && !wasMyTurn.current) cue("turn", 40);
    wasMyTurn.current = myTurn;
  }, [state, humanSeat, rollingDice]);

  // Winning -- the human's own win gets the fanfare + a celebratory buzz.
  useEffect(() => {
    if (state.turn.phase !== "round-ended" || winFired.current) return;
    winFired.current = true;
    if (state.winners?.some((w) => w.seat === humanSeat)) cue("win", [0, 60, 40, 120]);
  }, [state.turn.phase, state.winners, humanSeat]);
}

function totalMelds(state: GameState): number {
  return state.players.reduce((sum, p) => sum + p.melds.length, 0);
}
