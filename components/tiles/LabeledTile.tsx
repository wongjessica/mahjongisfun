"use client";

import { Tile } from "@/lib/mahjong/tiles";
import { useLang } from "@/components/i18n/LanguageContext";
import { tileName } from "@/lib/i18n/labels";
import { TileFace, TileSize } from "./TileFace";

interface LabeledTileProps {
  tile: Tile;
  size?: TileSize;
  layoutId?: string;
  highlight?: boolean;
  animateIn?: boolean;
  onClick?: () => void;
  selected?: boolean;
  speed?: "fast" | "slow" | "learn";
  enterDelay?: number;
}

/** A TileFace plus an always-visible plain-English caption underneath, e.g.
 * "3 Characters" or "Red Dragon" -- for places where quick recognition
 * matters more than density (the discard board, draw/win callouts). */
export function LabeledTile({ tile, size = "sm", ...rest }: LabeledTileProps) {
  const { lang } = useLang();
  return (
    <div className="flex w-fit flex-col items-center gap-0.5">
      <TileFace tile={tile} size={size} {...rest} />
      <span className="max-w-[3.2rem] text-center text-[9px] font-medium leading-tight text-slate-500">
        {tileName(tile, lang)}
      </span>
    </div>
  );
}
