import { describe, expect, it } from "vitest";
import { earningsForRound } from "../../wallet";
import { GameState, WinResult } from "../state";

function endedState(winners: Partial<WinResult>[] | null): GameState {
  return {
    winners: winners as GameState["winners"],
    isDraw: winners === null,
  } as GameState;
}

describe("HK settlement wallet", () => {
  it("self-draw collects fan x $10 from every player", () => {
    const state = endedState([{ seat: 1, fan: 9, selfDraw: true, fromSeat: null }]);
    expect(earningsForRound(state, 1)).toBe(270); // 3 payers x $90
    expect(earningsForRound(state, 0)).toBe(-90);
    expect(earningsForRound(state, 2)).toBe(-90);
    expect(earningsForRound(state, 3)).toBe(-90);
  });

  it("a discard win charges only the seat that fed the tile", () => {
    const state = endedState([{ seat: 2, fan: 5, selfDraw: false, fromSeat: 0 }]);
    expect(earningsForRound(state, 2)).toBe(50);
    expect(earningsForRound(state, 0)).toBe(-50);
    expect(earningsForRound(state, 1)).toBe(0); // bystanders pay nothing
    expect(earningsForRound(state, 3)).toBe(0);
  });

  it("a drawn round moves no money", () => {
    const state = endedState(null);
    for (const seat of [0, 1, 2, 3]) expect(earningsForRound(state, seat)).toBe(0);
  });

  it("a single discard winner collects only from the discarder", () => {
    const state = endedState([{ seat: 1, fan: 3, selfDraw: false, fromSeat: 0 }]);
    expect(earningsForRound(state, 0)).toBe(-30);
    expect(earningsForRound(state, 1)).toBe(30);
    expect(earningsForRound(state, 2)).toBe(0);
    expect(earningsForRound(state, 3)).toBe(0);
  });
});
