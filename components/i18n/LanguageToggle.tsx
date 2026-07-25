"use client";

import { useLang } from "./LanguageContext";
import { LANGS, LANG_LABEL } from "@/lib/i18n/lang";

/** A compact EN · 繁體 · 简体 switcher. `variant` tunes it for a dark game
 * surface vs. a light setup screen. */
export function LanguageToggle({ variant = "light", className = "" }: { variant?: "light" | "dark"; className?: string }) {
  const { lang, setLang } = useLang();
  const active = variant === "dark" ? "bg-emerald-500 text-white" : "bg-emerald-600 text-white";
  const idle =
    variant === "dark"
      ? "text-emerald-100/80 hover:bg-white/10"
      : "text-slate-500 hover:bg-slate-100";
  const shell = variant === "dark" ? "bg-black/25" : "bg-slate-100/80";
  return (
    <div className={`inline-flex items-center gap-0.5 rounded-full p-0.5 ${shell} ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${l === lang ? active : idle}`}
          aria-pressed={l === lang}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
