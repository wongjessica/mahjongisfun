"use client";

import { useEffect, useState } from "react";

/** Renders a scannable QR code for `value`. The qrcode library is
 * dynamically imported so it stays out of the initial bundle (it's only
 * needed when someone actually opens the QR), and generation happens in an
 * effect since it's async and browser-only. */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QR) => QR.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: "M" }))
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return <div className="animate-pulse rounded-lg bg-slate-100" style={{ width: size, height: size }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} width={size} height={size} alt="QR code to join this game" className="rounded-lg" />;
}
