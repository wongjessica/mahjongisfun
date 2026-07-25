"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/components/i18n/LanguageContext";

/** Toggles real fullscreen where the browser supports it (Android Chrome,
 * desktop). iOS Safari can't fullscreen an element, so we fall back to a tip
 * pointing at "Add to Home Screen", which launches the PWA chrome-free. */
export function FullscreenButton({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const [isFs, setIsFs] = useState(false);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const showTip = () => {
    setTip(true);
    setTimeout(() => setTip(false), 5000);
  };

  const toggle = async () => {
    if (!document.fullscreenEnabled) return showTip();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      showTip();
    }
  };

  return (
    <div className="relative">
      <button onClick={toggle} aria-label="Fullscreen" className={className}>
        {isFs ? "🡼" : "⛶"}
      </button>
      {tip && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-emerald-800 bg-emerald-950/95 p-2.5 text-[11px] leading-snug text-emerald-100 shadow-xl">
          {t("fullscreen.tip")}
        </div>
      )}
    </div>
  );
}
