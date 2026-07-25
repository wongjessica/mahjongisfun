"use client";

import { useLang } from "@/components/i18n/LanguageContext";

/** The table view is designed for landscape. On a portrait phone this
 * overlay covers everything and asks the player to rotate. Pure CSS
 * (Tailwind's portrait: variant) -- no orientation JS needed. */
export function RotatePrompt() {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-[60] hidden flex-col items-center justify-center gap-3 bg-emerald-950 text-center portrait:flex">
      <span className="text-5xl">🔄</span>
      <p className="text-lg font-bold text-emerald-100">{t("beta.rotate.title")}</p>
      <p className="max-w-xs px-6 text-sm text-emerald-300">{t("beta.rotate.desc")}</p>
    </div>
  );
}
