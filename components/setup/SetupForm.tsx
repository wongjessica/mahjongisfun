"use client";

import { useState } from "react";

export interface SetupConfig {
  fanMinimum: 0 | 3;
  seed: number;
}

const optionBase =
  "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors";
const optionActive = "border-blue-600 bg-blue-50 text-blue-700";
const optionInactive = "border-gray-300 text-gray-600 hover:bg-gray-50";

export function SetupForm({ onStart }: { onStart: (config: SetupConfig) => void }) {
  const [fanMinimum, setFanMinimum] = useState<0 | 3>(3);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hong Kong Mahjong</h1>
        <p className="mt-1 text-sm text-gray-500">Solo play against 3 intermediate bots.</p>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Win minimum</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setFanMinimum(0)}
            className={`${optionBase} ${fanMinimum === 0 ? optionActive : optionInactive}`}
          >
            0-fan minimum
          </button>
          <button
            type="button"
            onClick={() => setFanMinimum(3)}
            className={`${optionBase} ${fanMinimum === 3 ? optionActive : optionInactive}`}
          >
            3-fan minimum
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onStart({ fanMinimum, seed: Date.now() })}
        className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Start Game
      </button>
    </div>
  );
}
