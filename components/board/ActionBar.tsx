"use client";

import { motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { LegalAction, toGameAction } from "@/lib/mahjong/actions";
import { getLegalActions } from "@/lib/mahjong/reducer";

const btnBase =
  "rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors active:scale-[0.97]";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700`;
const btnSecondary = `${btnBase} bg-amber-500 text-white hover:bg-amber-600`;
const btnWin = `${btnBase} bg-emerald-600 text-white hover:bg-emerald-700`;
const btnGhost = `${btnBase} border border-slate-300 bg-white text-slate-600 hover:bg-slate-50`;

interface ActionBarProps {
  selectedTileId: string | null;
  onConsumeSelection: () => void;
}

export function ActionBar({ selectedTileId, onConsumeSelection }: ActionBarProps) {
  const { state, dispatch, humanSeat } = useGame();
  const legal = getLegalActions(state, humanSeat);

  const dispatchAction = (action: LegalAction) => {
    dispatch(toGameAction(action, humanSeat));
    onConsumeSelection();
  };

  if (legal.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/70 p-3 text-center text-sm text-slate-400">
        Waiting for other players…
      </div>
    );
  }

  const drawAction = legal.find((a) => a.type === "DRAW");
  const replaceAction = legal.find((a) => a.type === "REPLACE_FLOWER");
  const discardForSelected = selectedTileId
    ? legal.find((a) => a.type === "DISCARD" && a.tileId === selectedTileId)
    : undefined;
  const winAction = legal.find((a) => a.type === "DECLARE_WIN");
  const passAction = legal.find((a) => a.type === "PASS");
  const ponAction = legal.find((a) => a.type === "CALL_PON");
  const chiActions = legal.filter((a) => a.type === "CALL_CHI");
  const kongActions = legal.filter(
    (a) =>
      a.type === "CALL_KONG_EXPOSED" || a.type === "CALL_KONG_CONCEALED" || a.type === "CALL_KONG_ADDED"
  );

  return (
    <motion.div
      layout
      className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/90 p-3 shadow-lg backdrop-blur-sm"
    >
      {drawAction && (
        <button className={btnPrimary} onClick={() => dispatchAction(drawAction)}>
          🀫 Draw
        </button>
      )}
      {replaceAction && (
        <button className={btnPrimary} onClick={() => dispatchAction(replaceAction)}>
          🌸 Reveal flower &amp; draw
        </button>
      )}
      {discardForSelected && (
        <button className={btnPrimary} onClick={() => dispatchAction(discardForSelected)}>
          Discard
        </button>
      )}
      {winAction && (
        <button className={btnWin} onClick={() => dispatchAction(winAction)}>
          🏆 Declare Win
        </button>
      )}
      {ponAction && (
        <button className={btnSecondary} onClick={() => dispatchAction(ponAction)}>
          Pon
        </button>
      )}
      {kongActions.map((action, i) => (
        <button key={i} className={btnSecondary} onClick={() => dispatchAction(action)}>
          Kong
        </button>
      ))}
      {chiActions.map((action, i) => (
        <button key={i} className={btnSecondary} onClick={() => dispatchAction(action)}>
          Chi
        </button>
      ))}
      {passAction && (
        <button className={btnGhost} onClick={() => dispatchAction(passAction)}>
          Pass
        </button>
      )}
      {!drawAction &&
        !replaceAction &&
        !discardForSelected &&
        legal.some((a) => a.type === "DISCARD") && (
          <span className="text-sm text-slate-400">Tap a tile above to discard it</span>
        )}
    </motion.div>
  );
}
