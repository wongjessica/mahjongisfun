import confetti from "canvas-confetti";

// Gold/amber palette to match the round-end overlay's celebratory look,
// fired from both bottom corners toward center for a fuller burst than a
// single origin point gives.
const COLORS = ["#f59e0b", "#fbbf24", "#facc15", "#fde68a", "#dc2626"];

export function fireWinConfetti(): void {
  const shared: confetti.Options = { colors: COLORS, ticks: 220, disableForReducedMotion: true };

  confetti({ ...shared, particleCount: 90, spread: 70, angle: 60, origin: { x: 0, y: 0.9 } });
  confetti({ ...shared, particleCount: 90, spread: 70, angle: 120, origin: { x: 1, y: 0.9 } });
  confetti({ ...shared, particleCount: 60, spread: 100, angle: 90, origin: { x: 0.5, y: 0.4 }, startVelocity: 45 });
}
