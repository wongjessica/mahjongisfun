import { LabeledTile } from "@/components/tiles/LabeledTile";
import { Meld } from "@/lib/mahjong/melds";
import { WinResult } from "@/lib/mahjong/state";
import { sortTiles } from "@/lib/mahjong/tiles";

function MeldCluster({ meld }: { meld: Meld }) {
  return (
    <div className="flex gap-0.5 rounded-md bg-black/5 p-1">
      {meld.tiles.map((tile) => (
        <LabeledTile key={tile.id} tile={tile} size="sm" animateIn={false} />
      ))}
    </div>
  );
}

/** Full reveal of a winning hand -- every tile, exactly as it looked at the
 * moment of winning, so the fan total can actually be checked against the
 * tiles rather than taken on faith (this matters most for a bot's win,
 * since a bot's hand is otherwise always hidden). */
export function WinnerHand({ winner }: { winner: WinResult }) {
  const { concealedTiles, melds } = winner.revealedHand;

  return (
    <div className="flex flex-wrap items-start justify-center gap-1.5 rounded-lg bg-white/60 p-2">
      {melds.map((meld, i) => (
        <MeldCluster key={`${meld.type}-${i}-${meld.tiles[0]?.id}`} meld={meld} />
      ))}
      {sortTiles(concealedTiles).map((tile) => (
        <LabeledTile
          key={tile.id}
          tile={tile}
          size="sm"
          animateIn={false}
          highlight={tile.id === winner.wonTile.id}
        />
      ))}
    </div>
  );
}
