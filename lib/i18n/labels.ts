import { Lang } from "./lang";
import { Tile } from "@/lib/mahjong/tiles";

// Chinese numerals are identical in Traditional and Simplified.
const NUM_ZH = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

// Suit character differs only for Characters (萬/万).
const SUIT_CHAR: Record<"characters" | "dots" | "bamboo", Record<"zh-Hant" | "zh-Hans", string>> = {
  characters: { "zh-Hant": "萬", "zh-Hans": "万" },
  dots: { "zh-Hant": "筒", "zh-Hans": "筒" },
  bamboo: { "zh-Hant": "索", "zh-Hans": "索" },
};

const WIND_ZH: Record<number, Record<"zh-Hant" | "zh-Hans", string>> = {
  1: { "zh-Hant": "東風", "zh-Hans": "东风" },
  2: { "zh-Hant": "南風", "zh-Hans": "南风" },
  3: { "zh-Hant": "西風", "zh-Hans": "西风" },
  4: { "zh-Hant": "北風", "zh-Hans": "北风" },
};
const DRAGON_ZH: Record<number, Record<"zh-Hant" | "zh-Hans", string>> = {
  1: { "zh-Hant": "紅中", "zh-Hans": "红中" },
  2: { "zh-Hant": "青發", "zh-Hans": "青发" },
  3: { "zh-Hant": "白板", "zh-Hans": "白板" },
};
const FLOWER_ZH: Record<number, Record<"zh-Hant" | "zh-Hans", string>> = {
  1: { "zh-Hant": "梅", "zh-Hans": "梅" },
  2: { "zh-Hant": "蘭", "zh-Hans": "兰" },
  3: { "zh-Hant": "菊", "zh-Hans": "菊" },
  4: { "zh-Hant": "竹", "zh-Hans": "竹" },
};
const SEASON_ZH: Record<number, string> = { 1: "春", 2: "夏", 3: "秋", 4: "冬" };

// --- English names (source of truth for `en`) ---
const WIND_EN: Record<number, string> = { 1: "East Wind", 2: "South Wind", 3: "West Wind", 4: "North Wind" };
const DRAGON_EN: Record<number, string> = { 1: "Red Dragon", 2: "Green Dragon", 3: "White Dragon" };
const FLOWER_EN: Record<number, string> = { 1: "Plum", 2: "Orchid", 3: "Chrysanthemum", 4: "Bamboo Flower" };
const SEASON_EN: Record<number, string> = { 1: "Spring", 2: "Summer", 3: "Autumn", 4: "Winter" };

function tileNameEn(tile: Pick<Tile, "suit" | "rank">): string {
  switch (tile.suit) {
    case "characters":
      return `${tile.rank} Characters`;
    case "dots":
      return `${tile.rank} Dots`;
    case "bamboo":
      return `${tile.rank} Bamboo`;
    case "winds":
      return WIND_EN[tile.rank];
    case "dragons":
      return DRAGON_EN[tile.rank];
    case "flowers":
      return FLOWER_EN[tile.rank];
    case "seasons":
      return SEASON_EN[tile.rank];
  }
}

/** Plain-language name for a tile in the given language, e.g. "3 Bamboo" /
 * "三索". Used for the visible captions and callouts a player reads. */
export function tileName(tile: Pick<Tile, "suit" | "rank">, lang: Lang): string {
  if (lang === "en") return tileNameEn(tile);
  switch (tile.suit) {
    case "characters":
    case "dots":
    case "bamboo":
      return `${NUM_ZH[tile.rank]}${SUIT_CHAR[tile.suit][lang]}`;
    case "winds":
      return WIND_ZH[tile.rank][lang];
    case "dragons":
      return DRAGON_ZH[tile.rank][lang];
    case "flowers":
      return FLOWER_ZH[tile.rank][lang];
    case "seasons":
      return SEASON_ZH[tile.rank];
  }
}

// Wind name (East / 東風), plus a compact glyph for badges (E / 東).
const WIND_SHORT_EN: Record<number, string> = { 1: "East", 2: "South", 3: "West", 4: "North" };
const WIND_GLYPH_ZH: Record<number, Record<"zh-Hant" | "zh-Hans", string>> = {
  1: { "zh-Hant": "東", "zh-Hans": "东" },
  2: { "zh-Hant": "南", "zh-Hans": "南" },
  3: { "zh-Hant": "西", "zh-Hans": "西" },
  4: { "zh-Hant": "北", "zh-Hans": "北" },
};

/** Short wind label for seat/round badges: "East" / "東". */
export function windShort(wind: number, lang: Lang): string {
  return lang === "en" ? WIND_SHORT_EN[wind] : WIND_GLYPH_ZH[wind][lang];
}

// --- Fan / scoring pattern names, keyed by the engine's English label ---
const FAN_ZH: Record<string, Record<"zh-Hant" | "zh-Hans", string>> = {
  "All Honors": { "zh-Hant": "字一色", "zh-Hans": "字一色" },
  "All Sequences": { "zh-Hant": "平糊", "zh-Hans": "平糊" },
  "All Terminals": { "zh-Hant": "清老頭", "zh-Hans": "清老头" },
  "All Triplets": { "zh-Hant": "對對糊", "zh-Hans": "对对糊" },
  "Concealed Hand": { "zh-Hant": "門前清", "zh-Hans": "门前清" },
  "Dragon Triplet": { "zh-Hant": "三元牌", "zh-Hans": "三元牌" },
  Flowers: { "zh-Hant": "花牌", "zh-Hans": "花牌" },
  "Full Flush": { "zh-Hant": "清一色", "zh-Hans": "清一色" },
  "Great Four Winds": { "zh-Hant": "大四喜", "zh-Hans": "大四喜" },
  "Great Three Dragons": { "zh-Hant": "大三元", "zh-Hans": "大三元" },
  "Half Flush": { "zh-Hant": "混一色", "zh-Hans": "混一色" },
  "Kan Kan Wo": { "zh-Hant": "坎坎糊", "zh-Hans": "坎坎糊" },
  "Kong Replacement Win": { "zh-Hant": "槓上開花", "zh-Hans": "杠上开花" },
  "Last Tile": { "zh-Hant": "海底撈月", "zh-Hans": "海底捞月" },
  "Robbing the Kong": { "zh-Hant": "搶槓", "zh-Hans": "抢杠" },
  "Seat/Round Wind": { "zh-Hant": "圈／門風", "zh-Hans": "圈／门风" },
  "Self-Draw": { "zh-Hant": "自摸", "zh-Hans": "自摸" },
  "Seven Pairs": { "zh-Hant": "七對子", "zh-Hans": "七对子" },
  "Small Four Winds": { "zh-Hant": "小四喜", "zh-Hans": "小四喜" },
  "Small Three Dragons": { "zh-Hant": "小三元", "zh-Hans": "小三元" },
  "Terminals & Honors": { "zh-Hant": "混幺九", "zh-Hans": "混幺九" },
  "Thirteen Orphans": { "zh-Hant": "十三么", "zh-Hans": "十三幺" },
  "No Flowers": { "zh-Hant": "無花", "zh-Hans": "无花" },
};

/** Localized scoring-pattern name from the engine's English label. Falls back
 * to the English label if a translation is missing. */
export function fanName(label: string, lang: Lang): string {
  if (lang === "en") return label;
  return FAN_ZH[label]?.[lang] ?? label;
}
