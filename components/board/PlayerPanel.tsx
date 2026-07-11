"use client";

import { useGame } from "@/components/game/GameContext";
import { TileFace } from "@/components/tiles/TileFace";
import { Meld } from "@/lib/mahjong/melds";
import { sortTiles } from "@/lib/mahjong/tiles";

const WIND_NAMES: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };

function MeldGroup({ meld }: { meld: Meld }) {
  return (
    <div className="flex gap-0.5 rounded bg-gray-100 p-1">
      {meld.tiles.map((tile) => (
        <TileFace key={tile.id} tile={tile} size="sm" />
      ))}
    </div>
  );
}

interface PlayerPanelProps {
  seat: number;
  isHuman: boolean;
  selectedTileId?: string | null;
  onSelectTile?: (tileId: string) => void;
}

export function PlayerPanel({ seat, isHuman, selectedTileId, onSelectTile }: PlayerPanelProps) {
  const { state } = useGame();
  const player = state.players[seat];
  const isActive = state.turn.activeSeat === seat && state.turn.phase !== "round-ended";
  const isDealer = state.dealerIndex === seat;

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        isActive ? "border-blue-400 bg-blue-50/60" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-800">
          {isHuman ? "You" : `Bot ${seat}`} · {WIND_NAMES[player.seatWind]}
          {isDealer ? " (Dealer)" : ""}
        </span>
        <span className="font-mono text-gray-600">{player.score}</span>
      </div>

      {player.flowers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {player.flowers.map((tile) => (
            <TileFace key={tile.id} tile={tile} size="sm" />
          ))}
        </div>
      )}

      {player.melds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {player.melds.map((meld, i) => (
            <MeldGroup key={i} meld={meld} />
          ))}
        </div>
      )}

      {player.discards.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded bg-gray-50 p-1">
          {player.discards.map((tile) => (
            <TileFace key={tile.id} tile={tile} size="sm" />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {isHuman
          ? sortTiles(player.concealedTiles).map((tile) => (
              <TileFace
                key={tile.id}
                tile={tile}
                selected={tile.id === selectedTileId}
                onClick={onSelectTile ? () => onSelectTile(tile.id) : undefined}
              />
            ))
          : player.concealedTiles.map((tile) => <TileFace key={tile.id} faceDown size="sm" />)}
      </div>
    </div>
  );
}
