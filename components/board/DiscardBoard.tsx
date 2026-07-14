"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/components/game/GameContext";
import { LabeledTile } from "@/components/tiles/LabeledTile";
import { Tile } from "@/lib/mahjong/tiles";
import { nextSeat } from "@/lib/mahjong/state";

const WIND_DOT: Record<number, string> = {
  1: "bg-amber-500",
  2: "bg-rose-500",
  3: "bg-sky-500",
  4: "bg-violet-500",
};

/** Deterministic pseudo-random number in [0,1) from a tile id, so the
 * "scattered on the table" look is stable across re-renders instead of
 * jittering every time state changes. */
function hashUnit(id: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < id.length; i++) hash = (Math.imul(hash, 31) + id.charCodeAt(i)) | 0;
  return (hash >>> 0) / 4294967296;
}

function SeatRow({ seat, isHuman, isFirst }: { seat: number; isHuman: boolean; isFirst: boolean }) {
  const { state, speed, botNames } = useGame();
  const player = state.players[seat];
  const lastDiscardId =
    state.lastDiscard && state.lastDiscard.seat === seat ? state.lastDiscard.tile.id : null;
  const rowBorder = isFirst ? "" : "border-t border-slate-100";

  return (
    <>
      <div className={`flex items-center gap-1.5 pt-1.5 ${rowBorder}`}>
        <span className={`h-2 w-2 shrink-0 rounded-full ${WIND_DOT[player.seatWind]}`} />
        <span className="truncate text-xs font-semibold text-slate-600">
          {isHuman ? "You" : botNames[seat]}
        </span>
      </div>
      <div
        className={`flex min-h-[3.5rem] flex-wrap items-start gap-1.5 border-l border-slate-200 py-1.5 pl-2.5 ${rowBorder}`}
      >
        {player.discards.length > 0 ? (
          <AnimatePresence>
            {player.discards.map((tile) => (
              <LabeledTile
                key={tile.id}
                tile={tile}
                size="sm"
                layoutId={tile.id}
                highlight={tile.id === lastDiscardId}
                speed={speed}
              />
            ))}
          </AnimatePresence>
        ) : (
          <span className="pt-2 text-xs text-slate-300">—</span>
        )}
      </div>
    </>
  );
}

function AnonymousPool({ tiles, lastDiscardId }: { tiles: Tile[]; lastDiscardId: string | null }) {
  const { speed } = useGame();
  // Stable shuffle by id hash, so the pool looks scattered rather than
  // grouped by seat, without re-shuffling on every render.
  const scattered = [...tiles].sort((a, b) => hashUnit(a.id, 1) - hashUnit(b.id, 1));

  return (
    <div className="flex min-h-[8rem] flex-wrap content-start items-start gap-x-1 gap-y-3 rounded-lg bg-gradient-to-br from-emerald-800 to-emerald-900 p-3">
      {scattered.length === 0 ? (
        <span className="text-xs text-emerald-200/60">No discards yet</span>
      ) : (
        <AnimatePresence>
          {scattered.map((tile) => (
            <div
              key={tile.id}
              style={{
                transform: `rotate(${(hashUnit(tile.id, 2) - 0.5) * 26}deg) translateY(${(hashUnit(tile.id, 3) - 0.5) * 14}px)`,
              }}
            >
              <LabeledTile
                tile={tile}
                size="sm"
                layoutId={tile.id}
                highlight={tile.id === lastDiscardId}
                speed={speed}
              />
            </div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

/** The full discard history, always visible -- this is the central
 * "count the tiles" reference the rest of the UI supplements with quick
 * callouts, not a substitute for. Attributed mode shows 4 aligned rows (one
 * per seat); anonymous mode pools everything into one scattered table. */
export function DiscardBoard() {
  const { state, humanSeat, anonymousDiscards } = useGame();
  const rightSeat = nextSeat(humanSeat);
  const topSeat = nextSeat(rightSeat);
  const leftSeat = nextSeat(topSeat);

  const lastDiscardId = state.lastDiscard?.tile.id ?? null;
  const allDiscards = state.players.flatMap((p) => p.discards);

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/10 bg-white/90 p-3 shadow-lg backdrop-blur-sm"
    >
      <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Discards {anonymousDiscards && <span className="normal-case text-slate-300">(anonymous)</span>}
      </h2>
      {anonymousDiscards ? (
        <AnonymousPool tiles={allDiscards} lastDiscardId={lastDiscardId} />
      ) : (
        <div className="grid grid-cols-[4.5rem_1fr]">
          <SeatRow seat={humanSeat} isHuman isFirst />
          <SeatRow seat={rightSeat} isHuman={false} isFirst={false} />
          <SeatRow seat={topSeat} isHuman={false} isFirst={false} />
          <SeatRow seat={leftSeat} isHuman={false} isFirst={false} />
        </div>
      )}
    </motion.div>
  );
}
