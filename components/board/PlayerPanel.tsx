"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useGame } from "@/components/game/GameContext";
import { GameSpeed } from "@/components/setup/SetupForm";
import { TileFace, TileSize, tileLabel } from "@/components/tiles/TileFace";
import { Meld } from "@/lib/mahjong/melds";
import { sortTiles } from "@/lib/mahjong/tiles";

const DEAL_STAGGER_SECONDS = 0.045;

const WIND_AVATAR: Record<number, string> = {
  1: "bg-amber-500",
  2: "bg-rose-500",
  3: "bg-sky-500",
  4: "bg-violet-500",
};

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };

// Same color as the matching WIND_AVATAR above, just as a light-tinted badge
// instead of a solid fill -- ties the avatar's color coding to an actual
// readable label instead of asking players to memorize which color means
// which wind (the only way to tell your own seat wind before this was
// noticing the DEALER badge, which only ever shows up for East).
const WIND_BADGE: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-rose-100 text-rose-700",
  3: "bg-sky-100 text-sky-700",
  4: "bg-violet-100 text-violet-700",
};

export type SeatPosition = "left" | "across" | "right";

function Avatar({ seatWind, label }: { seatWind: number; label: string }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-inner ${WIND_AVATAR[seatWind]}`}
    >
      {label}
    </div>
  );
}

/** Flags who you can chi from (the seat immediately before your turn, i.e.
 * "to your left" in this layout) -- explicit rather than left as an exercise
 * in turn-order arithmetic. */
function PositionBadge({ position }: { position: SeatPosition }) {
  if (position === "left") {
    return (
      <span className="rounded bg-sky-100 px-1 py-0.5 text-[10px] font-bold text-sky-700">
        ← chi from here
      </span>
    );
  }
  return <span className="text-[10px] font-medium text-slate-400">{position}</span>;
}

/** A compact "N tiles in hand" indicator for opponents -- showing a full
 * row of face-down tile backs wastes space that the discard pile (the
 * thing you actually need to read to count tiles) needs more. */
function HandCount({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-500">
      <div className="relative h-6 w-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute top-0 h-6 w-4 rounded-[3px] border border-red-950/40"
            style={{
              left: i * 5,
              background: "linear-gradient(155deg, #8a2530 0%, #6d1a24 55%, #591620 100%)",
              zIndex: i,
            }}
          />
        ))}
      </div>
      <span className="text-xs font-semibold">{count} in hand</span>
    </div>
  );
}

function MeldGroup({ meld, speed }: { meld: Meld; speed: GameSpeed }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex gap-0.5 rounded-md bg-black/5 p-1"
    >
      {meld.tiles.map((tile) => (
        <TileFace key={tile.id} tile={tile} size="sm" layoutId={tile.id} speed={speed} />
      ))}
    </motion.div>
  );
}

interface PlayerPanelProps {
  seat: number;
  isHuman: boolean;
  selectedTileId?: string | null;
  onSelectTile?: (tileId: string) => void;
  onDiscardTile?: (tileId: string) => void;
  isThinking?: boolean;
  handSize?: TileSize;
  position?: SeatPosition;
}

export function PlayerPanel({
  seat,
  isHuman,
  selectedTileId,
  onSelectTile,
  onDiscardTile,
  isThinking,
  handSize = "md",
  position,
}: PlayerPanelProps) {
  const { state, speed, botNames } = useGame();
  const player = state.players[seat];
  const isActive = state.turn.activeSeat === seat && state.turn.phase !== "round-ended";
  const isDealer = state.dealerIndex === seat;
  const isRoundEnded = state.turn.phase === "round-ended";
  // Hands stay hidden during play (bots are face-down), but once the round
  // ends everyone's tiles are revealed so a win (or draw) can be checked.
  const revealHand = isHuman || isRoundEnded;

  const showDrawnSeparately = isHuman && state.lastDraw?.seat === seat && isActive;
  const drawnTileId = showDrawnSeparately ? state.lastDraw!.tile.id : null;
  const handTiles = revealHand
    ? sortTiles(player.concealedTiles.filter((t) => t.id !== drawnTileId))
    : [];

  // Only the very first render (the initial deal) should stagger tiles in
  // one at a time -- a later single-tile draw shouldn't get an artificial
  // delay, since there's nothing to stagger against.
  const isInitialDealRef = useRef(true);
  useEffect(() => {
    isInitialDealRef.current = false;
  }, []);
  const dealStagger = isInitialDealRef.current && speed === "slow";

  return (
    <motion.div
      layout
      className={`flex flex-col gap-1 rounded-xl border p-2 backdrop-blur-sm transition-colors ${
        isActive
          ? "border-amber-400 bg-white/90 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]"
          : "border-white/10 bg-white/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar seatWind={player.seatWind} label={isHuman ? "🙂" : botNames[seat][0]} />
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-sm font-semibold text-slate-800">
              {isHuman ? "You" : botNames[seat]}
              <span
                className={`rounded px-1 py-0.5 text-[10px] font-bold ${WIND_BADGE[player.seatWind]}`}
              >
                {WIND_NAMES[player.seatWind]}
              </span>
              {isDealer && (
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700">
                  DEALER
                </span>
              )}
              {!isHuman && position && <PositionBadge position={position} />}
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
              <TileFace key={tile.id} tile={tile} size="sm" layoutId={tile.id} speed={speed} />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {player.melds.map((meld, i) => (
              <MeldGroup key={`${meld.type}-${i}-${meld.tiles[0]?.id}`} meld={meld} speed={speed} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {revealHand ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap gap-1">
            <AnimatePresence>
              {handTiles.map((tile, i) => (
                <TileFace
                  key={tile.id}
                  tile={tile}
                  size={handSize}
                  layoutId={tile.id}
                  selected={tile.id === selectedTileId}
                  onClick={isHuman && onSelectTile ? () => onSelectTile(tile.id) : undefined}
                  onDoubleClick={
                    isHuman && onDiscardTile ? () => onDiscardTile(tile.id) : undefined
                  }
                  speed={speed}
                  enterDelay={dealStagger ? i * DEAL_STAGGER_SECONDS : 0}
                />
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showDrawnSeparately && (
              <motion.div
                key="drawn-slot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1 border-l-2 border-dashed border-amber-300 pl-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  Drawn
                </span>
                <TileFace
                  tile={state.lastDraw!.tile}
                  size={handSize}
                  layoutId={state.lastDraw!.tile.id}
                  selected={state.lastDraw!.tile.id === selectedTileId}
                  onClick={onSelectTile ? () => onSelectTile(state.lastDraw!.tile.id) : undefined}
                  onDoubleClick={onDiscardTile ? () => onDiscardTile(state.lastDraw!.tile.id) : undefined}
                  highlight
                  animateIn={false}
                  layoutAnimate={false}
                  lift={false}
                  speed={speed}
                />
                <span className="text-[9px] font-medium text-amber-700">
                  {tileLabel(state.lastDraw!.tile)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <HandCount count={player.concealedTiles.length} />
      )}
    </motion.div>
  );
}
