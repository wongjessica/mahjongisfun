"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted, unlockAudio } from "@/lib/sound";

/** Live view of the global mute flag as React state. */
export function useMuted(): [boolean, (next: boolean) => void] {
  const [m, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  const set = (next: boolean) => {
    setMuted(next);
    setM(next);
  };
  return [m, set];
}

export function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, set] = useMuted();
  return (
    <button
      type="button"
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        unlockAudio();
        set(!muted);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-colors ${className}`}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
