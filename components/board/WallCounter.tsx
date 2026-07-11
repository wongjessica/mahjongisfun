import { GameState } from "@/lib/mahjong/state";

export function WallCounter({ state }: { state: GameState }) {
  return (
    <div className="flex flex-col items-center text-xs text-gray-300">
      <span className="text-lg font-semibold text-white">{state.wall.liveTiles.length}</span>
      <span>tiles left</span>
    </div>
  );
}
