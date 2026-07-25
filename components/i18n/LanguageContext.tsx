"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Lang } from "@/lib/i18n/lang";
import { translate } from "@/lib/i18n/messages";

const KEY = "mahjong-lang";

interface LanguageValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key with optional `{var}` interpolation. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Load the saved choice after mount (localStorage is client-only, and we
  // must not diverge from the server-rendered "en" during hydration).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY) as Lang | null;
      if (saved === "en" || saved === "zh-Hant" || saved === "zh-Hans") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(key, lang, vars), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** Access the current language, a setter, and the `t` translator. Safe to
 * call outside a provider (defaults to English) so isolated components and
 * tests don't crash. */
export function useLang(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return { lang: "en", setLang: () => {}, t: (key, vars) => translate(key, "en", vars) };
}
