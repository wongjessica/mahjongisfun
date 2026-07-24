const KEY = "mahjong-tutorial-done";

/** Whether the visitor has finished the tutorial before -- lets the homepage
 * soften the "Learn to Play" prompt into a "replay" once they know the game.
 * Guarded for SSR (localStorage is browser-only). */
export function hasCompletedTutorial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialComplete(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* private mode / storage full -- non-fatal, just skip persistence */
  }
}
