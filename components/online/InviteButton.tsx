"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useLang } from "@/components/i18n/LanguageContext";
import { QrCode } from "./QrCode";

/** In-game invite affordance: a small button in the status bar that opens a
 * modal with the room code + QR + copy-link, so a friend can join a match
 * that's already running (they'll spectate, then take an open seat). Shown
 * only in online play (CenterTable renders it when a roomCode is present). */
export function InviteButton({ code }: { code: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?room=${code}`
      : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked -- the visible code/QR are the fallback.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("invite.title")}
        className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-950/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-100 hover:bg-emerald-900/50"
      >
        👥 {t("invite.button")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>

              <h2 className="text-lg font-bold text-slate-900">{t("invite.title")}</h2>
              <button
                onClick={copy}
                title={t("invite.copyLink")}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-emerald-700 hover:border-emerald-400"
              >
                {code}
                <span className="font-sans text-xs font-semibold tracking-normal text-emerald-500">
                  {copied ? t("lobby.copied") : t("lobby.copyLink")}
                </span>
              </button>

              <div className="mt-3 flex justify-center">
                <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                  <QrCode value={inviteUrl} size={180} />
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-400">{t("invite.scanNote")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
