"use client";

import { useEffect } from "react";
import { loadMutePreference, unlockAudio } from "@/lib/sound";

/** Loads the saved mute preference and arms the AudioContext on the first
 * user gesture (browsers block audio until then). Mounted once in the root
 * layout. */
export function SoundInit() {
  useEffect(() => {
    loadMutePreference();
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  return null;
}
