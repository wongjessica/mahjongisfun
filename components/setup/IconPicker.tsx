"use client";

export const ICON_CHOICES = [
  "🙂", "😎", "🐉", "🐼", "🦊", "🐱", "🐸", "🦆",
  "🦄", "🌸", "🍜", "🀄", "🔥", "🌙", "⭐", "🍀",
];

const ICON_KEY = "mahjong-player-icon";

export function getSavedIcon(): string {
  try {
    const saved = localStorage.getItem(ICON_KEY);
    return saved && ICON_CHOICES.includes(saved) ? saved : ICON_CHOICES[0];
  } catch {
    return ICON_CHOICES[0];
  }
}

export function saveIcon(icon: string): void {
  localStorage.setItem(ICON_KEY, icon);
}

export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">Your icon</span>
      <div className="mt-2 grid grid-cols-8 gap-1">
        {ICON_CHOICES.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={`flex h-9 items-center justify-center rounded-lg border-2 text-lg transition-all ${
              value === icon
                ? "border-emerald-500 bg-emerald-50 shadow-[0_0_0_2px_rgba(16,185,129,0.15)]"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
