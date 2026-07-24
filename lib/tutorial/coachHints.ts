import { getLegalActions } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";

export type CoachTone = "action" | "info" | "celebrate";

export interface CoachHint {
  /** Stable id so the coach UI only re-animates when the guidance changes,
   * not on every unrelated state tick. */
  id: string;
  tone: CoachTone;
  text: string;
}

/** Turns the current game situation into one beginner-friendly instruction
 * for the human seat. Pure: reads only the engine state (via the same
 * getLegalActions the UI and bots use), so it can never contradict what's
 * actually allowed. Returns null when there's nothing useful to say. */
export function coachHint(
  state: GameState,
  humanSeat: number,
  nameForSeat: (seat: number) => string
): CoachHint | null {
  if (state.turn.phase === "round-ended") {
    if (state.winners?.some((w) => w.seat === humanSeat)) {
      return { id: "won", tone: "celebrate", text: "🎉 You won! Scroll the results to see exactly how your hand scored, then play on." };
    }
    if (state.isDraw) {
      return { id: "draw", tone: "info", text: "The wall ran out before anyone finished — that's a draw. Start a new round and try again." };
    }
    const winner = state.winners?.[0];
    const who = winner ? nameForSeat(winner.seat) : "Someone";
    return { id: "lost", tone: "info", text: `${who} completed their hand this time. Peek at the results to see what they built, then start a new round.` };
  }

  const legal = getLegalActions(state, humanSeat);
  const types = new Set(legal.map((a) => a.type));

  if (types.has("DECLARE_WIN")) {
    return { id: "win", tone: "celebrate", text: "🎉 Your hand is complete — tap the green Win button to take the round!" };
  }

  const inCallWindow = state.turn.phase === "awaiting-call-responses";
  if (inCallWindow && (types.has("CALL_PON") || types.has("CALL_CHI") || types.has("CALL_KONG_EXPOSED"))) {
    const calls: string[] = [];
    if (types.has("CALL_PON")) calls.push("Pon (make a triplet)");
    if (types.has("CALL_CHI")) calls.push("Chi (make a run)");
    if (types.has("CALL_KONG_EXPOSED")) calls.push("Kong (all four)");
    return {
      id: "call",
      tone: "action",
      text: `You can claim that discard — ${calls.join(" · ")}. It reveals those tiles face-up, so only call if it finishes a set you need. Otherwise tap Pass.`,
    };
  }

  if (inCallWindow && types.has("PASS")) {
    return { id: "pass", tone: "info", text: "That discard doesn't help your hand — tap Pass and wait for your turn." };
  }

  if (types.has("DISCARD")) {
    return {
      id: "discard",
      tone: "action",
      text: "Your turn. Tap a tile you don't need, then Discard it — keep the ones building your 4 sets + 1 pair.",
    };
  }

  if (types.has("DRAW")) {
    return { id: "draw", tone: "action", text: "Your turn — tap Draw to take a fresh tile from the wall." };
  }

  if (types.has("REPLACE_FLOWER")) {
    return { id: "flower", tone: "info", text: "You drew a bonus flower! It sets aside for extra points and you'll draw a replacement automatically." };
  }

  const active = state.turn.activeSeat;
  if (active !== humanSeat) {
    return { id: `watch-${active}`, tone: "info", text: `${nameForSeat(active)} is playing. Watch their discard — you might be able to claim it, and you're up soon.` };
  }

  return null;
}
