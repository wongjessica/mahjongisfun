"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/components/i18n/LanguageContext";

/** Toggles real fullscreen where the browser supports it (Android Chrome,
 * desktop). iOS Safari can't fullscreen an element, so there we show clear
 * "Add to Home Screen" steps instead -- which, thanks to the standalone PWA
 * manifest + apple meta tags, launches the game with no Safari bars. The
 * button hides itself entirely once already running standalone. */
export function FullscreenButton({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const [isFs, setIsFs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  // On iOS, only Safari can install a fullscreen home-screen app -- Chrome and
  // other browsers can't (Apple forces WebKit and disables the PWA path), so
  // we steer those users to Safari.
  const [iosOtherBrowser, setIosOtherBrowser] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    const inStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(Boolean(inStandalone));
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIosOtherBrowser(isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua));
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Already chrome-free -- nothing to offer.
  if (standalone) return null;

  const toggle = async () => {
    if (!document.fullscreenEnabled) return setShowHelp(true);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setShowHelp(true);
    }
  };

  return (
    <>
      <button onClick={toggle} aria-label={t("fullscreen.iosTitle")} className={className}>
        {isFs ? "🡼" : "⛶"}
      </button>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-800 shadow-2xl"
            >
              <h2 className="text-lg font-bold text-emerald-900">📱 {t("fullscreen.iosTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {iosOtherBrowser ? t("fullscreen.chromeIntro") : t("fullscreen.iosIntro")}
              </p>
              <ol className="mt-3 flex flex-col gap-2">
                {[
                  iosOtherBrowser ? t("fullscreen.chromeStep1") : t("fullscreen.iosStep1"),
                  t("fullscreen.iosStep2"),
                  t("fullscreen.iosStep3"),
                ].map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {t("common.gotIt")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
