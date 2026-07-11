"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { TileFace, TileSize } from "@/components/tiles/TileFace";
import { Meld } from "@/lib/mahjong/melds";
import { sortTiles } from "@/lib/mahjong/tiles";

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };
const WIND_AVATAR: Record<number, string> = {
  1: "bg-amber-500",
  2: "bg-rose-500",
  3: "bg-sky-500",
  4: "bg-violet-500",
};

function Avatar({ seatWind, isHuman }: { seatWind: number; isHuman: boolean }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner ${WIND_AVATAR[seatWind]}`}
    >
      {isHuman ? "🙂" : WIND_NAMES[seatWind][0]}
    </div>
  );
}

function MeldGroup({ meld }: { meld: Meld }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex gap-0.5 rounded-md bg-black/5 p-1"
    >
      {meld.tiles.map((tile) => (
        <TileFace key={tile.id} tile={tile} size="sm" layoutId={tile.id} />
      ))}
    </motion.div>
  );
}

interface PlayerPanelProps {
  seat: number;
  isHuman: boolean;
  selectedTileId?: string | null;
  onSelectTile?: (tileId: string) => void;
  isThinking?: boolean;
  handSize?: TileSize;
  compact?: boolean;
}

export function PlayerPanel({
  seat,
  isHuman,
  selectedTileId,
  onSelectTile,
  isThinking,
  handSize = "md",
  compact,
}: PlayerPanelProps) {
  const { state } = useGame();
  const player = state.players[seat];
  const isActive = state.turn.activeSeat === seat && state.turn.phase !== "round-ended";
  const isDealer = state.dealerIndex === seat;
  const lastDiscardId =
    state.lastDiscard && state.lastDiscard.seat === seat ? state.lastDiscard.tile.id : null;

  return (
    <motion.div
      layout
      className={`flex flex-col gap-1.5 rounded-xl border p-2.5 backdrop-blur-sm transition-colors ${
        isActive
          ? "border-amber-400 bg-white/90 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]"
          : "border-white/10 bg-white/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar seatWind={player.seatWind} isHuman={isHuman} />
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-800">
              {isHuman ? "You" : `Bot · ${WIND_NAMES[player.seatWind]}`}
              {isDealer && (
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700">
                  DEALER
                </span>
              )}
            </div>
            {isThinking && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-400"
              >
                thinking
                <motion.span
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                >
                  •••
                </motion.span>
              </motion.span>
            )}
          </div>
        </div>
        <span
          className={`font-mono text-sm font-semibold ${
            player.score > 0 ? "text-emerald-600" : player.score < 0 ? "text-rose-600" : "text-slate-400"
          }`}
        >
          {player.score > 0 ? `+${player.score}` : player.score}
        </span>
      </div>

      {(player.flowers.length > 0 || player.melds.length > 0) && (
        <div className="flex flex-wrap gap-1">
          <AnimatePresence>
            {player.flowers.map((tile) => (
              <TileFace key={tile.id} tile={tile} size="sm" layoutId={tile.id} />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {player.melds.map((meld, i) => (
              <MeldGroup key={`${meld.type}-${i}-${meld.tiles[0]?.id}`} meld={meld} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!compact && player.discards.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-md bg-black/5 p-1.5">
          <AnimatePresence>
            {player.discards.map((tile) => (
              <TileFace
                key={tile.id}
                tile={tile}
                size="sm"
                layoutId={tile.id}
                highlight={tile.id === lastDiscardId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <AnimatePresence>
          {isHuman
            ? sortTiles(player.concealedTiles).map((tile) => (
                <TileFace
                  key={tile.id}
                  tile={tile}
                  size={handSize}
                  layoutId={tile.id}
                  selected={tile.id === selectedTileId}
                  onClick={onSelectTile ? () => onSelectTile(tile.id) : undefined}
                />
              ))
            : player.concealedTiles.map((tile) => (
                <TileFace key={tile.id} faceDown size={compact ? "sm" : handSize} animateIn={false} />
              ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
