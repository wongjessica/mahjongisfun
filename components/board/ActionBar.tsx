"use client";

import { useGame } from "@/components/game/GameContext";
import { LegalAction, toGameAction } from "@/lib/mahjong/actions";
import { getLegalActions } from "@/lib/mahjong/reducer";

const btnPrimary = "rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700";
const btnSecondary = "rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600";
const btnWin = "rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700";
const btnGhost = "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50";

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
    return <div className="p-2 text-sm text-gray-400">Waiting for other players…</div>;
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
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      {drawAction && (
        <button className={btnPrimary} onClick={() => dispatchAction(drawAction)}>
          Draw
        </button>
      )}
      {replaceAction && (
        <button className={btnPrimary} onClick={() => dispatchAction(replaceAction)}>
          Reveal flower &amp; draw replacement
        </button>
      )}
      {discardForSelected && (
        <button className={btnPrimary} onClick={() => dispatchAction(discardForSelected)}>
          Discard selected tile
        </button>
      )}
      {winAction && (
        <button className={btnWin} onClick={() => dispatchAction(winAction)}>
          Declare Win
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
          <span className="text-sm text-gray-400">Select a tile to discard</span>
        )}
    </div>
  );
}
