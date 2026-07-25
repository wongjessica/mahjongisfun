export type Lang = "en" | "zh-Hant" | "zh-Hans";

export const LANGS: Lang[] = ["en", "zh-Hant", "zh-Hans"];

/** How each language names itself in the switcher. */
export const LANG_LABEL: Record<Lang, string> = {
  en: "EN",
  "zh-Hant": "繁體",
  "zh-Hans": "简体",
};

export const isChinese = (lang: Lang): boolean => lang === "zh-Hant" || lang === "zh-Hans";
