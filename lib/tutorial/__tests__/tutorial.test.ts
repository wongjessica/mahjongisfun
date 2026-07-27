import { describe, expect, it } from "vitest";
import { LESSONS, TOTAL_STEPS } from "@/lib/tutorial/lessons";
import { coachHint } from "@/lib/tutorial/coachHints";
import { createInitialState } from "@/lib/mahjong/reducer";
import { GameState } from "@/lib/mahjong/state";
import { tileKey } from "@/lib/mahjong/tiles";

const name = (seat: number) => (seat === 0 ? "You" : "Bot");

describe("tutorial lesson content", () => {
  it("TOTAL_STEPS matches the sum of every lesson's steps", () => {
    const sum = LESSONS.reduce((n, l) => n + l.steps.length, 0);
    expect(TOTAL_STEPS).toBe(sum);
    expect(TOTAL_STEPS).toBeGreaterThan(0);
  });

  it("every quiz has exactly one correct option", () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.kind !== "quiz") continue;
        const correct = step.options.filter((o) => o.correct).length;
        expect(correct, `${lesson.id}: "${step.title.en}"`).toBe(1);
      }
    }
  });

  it("every pick step's correct keys actually appear among its choices", () => {
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        if (step.kind !== "pick") continue;
        expect(step.correctKeys.length, `${lesson.id}: "${step.title.en}"`).toBeGreaterThan(0);
        const choiceKeys = new Set(step.choices.map((t) => tileKey(t)));
        for (const key of step.correctKeys) {
          expect(choiceKeys.has(key), `${lesson.id}: "${step.title.en}" missing ${key}`).toBe(true);
        }
      }
    }
  });
});

describe("coachHint", () => {
  it("congratulates the human when they win the round", () => {
    const won = {
      turn: { phase: "round-ended", activeSeat: 0 },
      winners: [{ seat: 0 }],
      isDraw: false,
      players: [{ discards: [], melds: [] }, {}, {}, {}],
    } as unknown as GameState;
    expect(coachHint(won, 0, name)?.id).toBe("won");
    expect(coachHint(won, 0, name)?.tone).toBe("celebrate");
  });

  it("explains a draw and a loss without crashing", () => {
    const draw = {
      turn: { phase: "round-ended", activeSeat: 0 },
      winners: null,
      isDraw: true,
      players: [{ discards: [], melds: [] }, {}, {}, {}],
    } as unknown as GameState;
    expect(coachHint(draw, 0, name)?.id).toBe("draw");

    const lost = {
      turn: { phase: "round-ended", activeSeat: 0 },
      winners: [{ seat: 2 }],
      isDraw: false,
      players: [{ discards: [], melds: [] }, {}, {}, {}],
    } as unknown as GameState;
    expect(coachHint(lost, 0, name)?.id).toBe("lost");
  });

  it("tells the dealer to discard on the opening turn, and others to watch", () => {
    const state = createInitialState({ fanMinimum: 0, seed: 1, humanSeat: 0, dealerIndex: 0 });
    // Seat 0 is the dealer -> it's their turn to discard the 14th tile.
    expect(coachHint(state, 0, name)?.id).toBe("discard");
    // From a non-active seat's perspective, the coach says to watch (stable id
    // so it doesn't re-animate every time play moves to a different bot).
    expect(coachHint(state, 1, name)?.id).toBe("watch");
  });
});
