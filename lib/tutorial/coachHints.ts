import { getLegalActions } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";
import { Lang } from "@/lib/i18n/lang";
import { translate } from "@/lib/i18n/messages";

export type CoachTone = "action" | "info" | "celebrate";

export interface CoachHint {
  /** Stable id so the coach UI only re-animates when the guidance changes,
   * not on every unrelated state tick. */
  id: string;
  tone: CoachTone;
  text: string;
}

/** Turns the current game situation into one beginner-friendly instruction
 * for the human seat, in the given language. Pure: reads only the engine
 * state (via the same getLegalActions the UI and bots use), so it can never
 * contradict what's actually allowed. Returns null when there's nothing
 * useful to say. */
export function coachHint(
  state: GameState,
  humanSeat: number,
  nameForSeat: (seat: number) => string,
  lang: Lang = "en"
): CoachHint | null {
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars);

  if (state.turn.phase === "round-ended") {
    if (state.winners?.some((w) => w.seat === humanSeat)) {
      return { id: "won", tone: "celebrate", text: t("coach.won") };
    }
    if (state.isDraw) {
      return { id: "draw", tone: "info", text: t("coach.draw") };
    }
    const winner = state.winners?.[0];
    const who = winner ? nameForSeat(winner.seat) : nameForSeat(-1);
    return { id: "lost", tone: "info", text: t("coach.lost", { name: who }) };
  }

  const legal = getLegalActions(state, humanSeat);
  const types = new Set(legal.map((a) => a.type));

  if (types.has("DECLARE_WIN")) {
    return { id: "win", tone: "celebrate", text: t("coach.win") };
  }

  const inCallWindow = state.turn.phase === "awaiting-call-responses";
  if (inCallWindow && (types.has("CALL_PON") || types.has("CALL_CHI") || types.has("CALL_KONG_EXPOSED"))) {
    const calls: string[] = [];
    if (types.has("CALL_PON")) calls.push(t("coach.call.pong"));
    if (types.has("CALL_CHI")) calls.push(t("coach.call.chi"));
    if (types.has("CALL_KONG_EXPOSED")) calls.push(t("coach.call.kong"));
    return { id: "call", tone: "action", text: t("coach.call", { calls: calls.join(" · ") }) };
  }

  if (inCallWindow && types.has("PASS")) {
    return { id: "pass", tone: "info", text: t("coach.pass") };
  }

  if (types.has("DISCARD")) {
    return { id: "discard", tone: "action", text: t("coach.discard") };
  }

  if (types.has("DRAW")) {
    return { id: "draw", tone: "action", text: t("coach.drawTile") };
  }

  if (types.has("REPLACE_FLOWER")) {
    return { id: "flower", tone: "info", text: t("coach.flower") };
  }

  const active = state.turn.activeSeat;
  if (active !== humanSeat) {
    // Stable id ("watch", not "watch-<seat>") so the message updates in place
    // as play goes around instead of re-animating on every bot's turn.
    return { id: "watch", tone: "info", text: t("coach.watch", { name: nameForSeat(active) }) };
  }

  return null;
}
