"use client";

import { motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { LegalAction, toGameAction } from "@/lib/mahjong/actions";
import { getLegalActions } from "@/lib/mahjong/reducer";
import { TileFace, tileLabel } from "@/components/tiles/TileFace";

const btnBase =
  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.96]";
const btnSecondary = `${btnBase} bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-amber-900/20 hover:from-amber-400 hover:to-amber-600`;
const btnWin = `${btnBase} bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-emerald-900/30 hover:from-emerald-400 hover:to-emerald-600`;
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

  // Drawing / revealing a flower isn't a real decision -- useHumanAutoDraw
  // dispatches it automatically, so no button is needed for either.
  if (legal.length === 1 && (legal[0].type === "DRAW" || legal[0].type === "REPLACE_FLOWER")) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/70 p-3 text-center text-sm text-slate-400">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-slate-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        Drawing…
      </div>
    );
  }

  const player = state.players[humanSeat];
  const selectedTile = selectedTileId
    ? player.concealedTiles.find((t) => t.id === selectedTileId)
    : undefined;
  const discardForSelected = selectedTileId
    ? legal.find((a) => a.type === "DISCARD" && a.tileId === selectedTileId)
    : undefined;
  const winAction = legal.find((a) => a.type === "DECLARE_WIN");
  const passAction = legal.find((a) => a.type === "PASS");
  const ponAction = legal.find((a) => a.type === "CALL_PON");
  const chiActions = legal.filter((a) => a.type === "CALL_CHI");
  // Show every legal kong: whenever it's your turn and you hold four of a
  // kind (concealed kong) or the fourth of an existing pon (added kong),
  // you may declare it -- not only on the turn you drew the fourth tile.
  // getLegalActions already scopes these to your own turn, so this can't
  // nag on someone else's turn.
  const kongActions = legal.filter(
    (a) =>
      a.type === "CALL_KONG_EXPOSED" ||
      a.type === "CALL_KONG_CONCEALED" ||
      a.type === "CALL_KONG_ADDED"
  );

  return (
    <motion.div
      layout
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/90 p-2 shadow-lg backdrop-blur-sm"
    >
      {discardForSelected && selectedTile && (
        <motion.button
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatchAction(discardForSelected)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 py-1.5 pl-1.5 pr-4 text-white shadow-lg shadow-blue-900/30 transition-colors hover:from-blue-500 hover:to-blue-700"
        >
          <TileFace tile={selectedTile} size="sm" animateIn={false} />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">
              Discard
            </span>
            <span className="text-sm font-bold">{tileLabel(selectedTile)}</span>
          </span>
        </motion.button>
      )}
      {winAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          className={btnWin}
          onClick={() => dispatchAction(winAction)}
        >
          🏆 Declare Win
        </motion.button>
      )}
      {ponAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          className={btnSecondary}
          onClick={() => dispatchAction(ponAction)}
        >
          Pon
        </motion.button>
      )}
      {kongActions.map((action, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          className={btnSecondary}
          onClick={() => dispatchAction(action)}
        >
          Kong
        </motion.button>
      ))}
      {chiActions.map((action) => {
        const t1 = player.concealedTiles.find((t) => t.id === action.tileIds[0]);
        const t2 = player.concealedTiles.find((t) => t.id === action.tileIds[1]);
        if (!t1 || !t2) return null;
        return (
          <motion.button
            key={action.tileIds.join("-")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatchAction(action)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 py-1.5 pl-2 pr-3 text-white shadow-sm shadow-amber-900/20 transition-all hover:from-amber-400 hover:to-amber-600"
          >
            <div className="flex -space-x-2">
              <TileFace tile={t1} size="sm" animateIn={false} />
              <TileFace tile={t2} size="sm" animateIn={false} />
            </div>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-100">
                Chi with
              </span>
              <span className="text-xs font-bold">
                {tileLabel(t1)} + {tileLabel(t2)}
              </span>
            </span>
          </motion.button>
        );
      })}
      {passAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          className={btnGhost}
          onClick={() => dispatchAction(passAction)}
        >
          Pass
        </motion.button>
      )}
      {!discardForSelected && legal.some((a) => a.type === "DISCARD") && (
        <span className="text-sm text-slate-400">Tap a tile above to discard it</span>
      )}
    </motion.div>
  );
}
