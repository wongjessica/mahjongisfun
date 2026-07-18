/**
 * Game sound + haptics. Sounds are SYNTHESIZED with the Web Audio API
 * (short enveloped oscillators + filtered noise) rather than loaded from
 * audio files -- no binary assets to bundle, works fully offline, and it's
 * a few KB of code. Haptics use navigator.vibrate (Android/Chrome; iOS
 * Safari has no web vibration, so it silently no-ops there).
 *
 * A single mute flag (persisted) gates both. The AudioContext can only
 * start after a user gesture, so callers arm it via unlockAudio() on the
 * first interaction (e.g. tapping Start Game).
 */

const MUTE_KEY = "mahjong-muted";

let ctx: AudioContext | null = null;
let muted = false;

export function isMuted(): boolean {
  return muted;
}

/** Read the persisted setting; call once on the client at startup. */
export function loadMutePreference(): boolean {
  try {
    muted = localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    muted = false;
  }
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, String(next));
  } catch {
    // Non-fatal: the setting just won't persist.
  }
  if (!next) unlockAudio();
}

/** Create/resume the AudioContext. Must be called from within a user
 * gesture at least once (browsers block audio before that). Safe to call
 * repeatedly. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function now(): number {
  return ctx ? ctx.currentTime : 0;
}

/** One enveloped oscillator note. */
function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine"): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(env).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** A short filtered-noise "knock" -- the body of a tile clack. */
function knock(start: number, gain: number, freq: number): void {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = 1.2;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, start);
  env.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);
  src.connect(band).connect(env).connect(ctx.destination);
  src.start(start);
  src.stop(start + 0.08);
}

export type SoundName = "discard" | "draw" | "dice" | "win" | "call" | "turn";

const PLAYERS: Record<SoundName, () => void> = {
  // Tile hitting the table: a wooden "tock" -- low sine thump + noise knock.
  discard() {
    const t = now();
    tone(180, t, 0.09, 0.18, "sine");
    knock(t, 0.5, 1400);
  },
  // Picking a tile off the wall: a soft, higher tick.
  draw() {
    knock(now(), 0.28, 2200);
  },
  // Dice tumbling: a quick rattle of noise pips, then a settle knock.
  dice() {
    const t = now();
    for (let i = 0; i < 6; i++) knock(t + i * 0.06, 0.22, 900 + Math.random() * 1200);
    knock(t + 0.42, 0.5, 700);
  },
  // Winning: a bright ascending arpeggio (C-E-G-C).
  win() {
    const t = now();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone(f, t + i * 0.11, 0.5, 0.22, "triangle"));
  },
  // Calling pon/chi/kong: an emphatic double-clack.
  call() {
    const t = now();
    knock(t, 0.5, 1200);
    knock(t + 0.08, 0.45, 1000);
    tone(140, t, 0.1, 0.16, "sine");
  },
  // Your turn: a soft two-note prompt.
  turn() {
    const t = now();
    tone(660, t, 0.14, 0.14, "sine");
    tone(880, t + 0.09, 0.16, 0.14, "sine");
  },
};

export function playSound(name: SoundName): void {
  if (muted || !ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    PLAYERS[name]();
  } catch {
    // Audio glitches must never break gameplay.
  }
}

/** Short vibration (Android/Chrome only; no-ops where unsupported, e.g. iOS
 * Safari). Gated by the same mute flag as sound. */
export function vibrate(pattern: number | number[]): void {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Unsupported -- ignore.
  }
}

/** Convenience: play a sound and fire a matching haptic together. */
export function cue(name: SoundName, haptic?: number | number[]): void {
  playSound(name);
  if (haptic !== undefined) vibrate(haptic);
}
