"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { TileFace } from "@/components/tiles/TileFace";
import { LESSONS, LessonStep, TileGroup, TOTAL_STEPS } from "@/lib/tutorial/lessons";
import { Tile, tileKey } from "@/lib/mahjong/tiles";

/** A labelled cluster of tiles used inside lessons. */
function GroupRow({ group }: { group: TileGroup }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap items-end justify-center gap-1">
        {group.tiles.map((t) => (
          <TileFace key={t.id} tile={t} size="sm" animateIn={false} />
        ))}
      </div>
      {group.label && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/70">
          {group.label}
        </span>
      )}
    </div>
  );
}

function Groups({ groups }: { groups?: TileGroup[] }) {
  if (!groups?.length) return null;
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-3 rounded-2xl bg-emerald-50/80 p-4">
      {groups.map((g, i) => (
        <GroupRow key={i} group={g} />
      ))}
    </div>
  );
}

interface LessonViewProps {
  onFinishAll: () => void;
  onExit: () => void;
}

export function LessonView({ onFinishAll, onExit }: LessonViewProps) {
  const [lessonIdx, setLessonIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  // Per-step interaction state (reset on every navigation).
  const [selected, setSelected] = useState<number | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [wrong, setWrong] = useState(false);

  const lesson = LESSONS[lessonIdx];
  const step = lesson.steps[stepIdx];

  // Global 0-based index of the current step, for the progress bar.
  const globalIndex = useMemo(() => {
    let n = 0;
    for (let i = 0; i < lessonIdx; i++) n += LESSONS[i].steps.length;
    return n + stepIdx;
  }, [lessonIdx, stepIdx]);

  const resetStepState = () => {
    setSelected(null);
    setPickedId(null);
    setRevealed(false);
    setWrong(false);
  };

  const canProceed =
    step.kind === "info" || (step.kind === "quiz" && selected !== null) || (step.kind === "pick" && revealed);

  const isVeryFirst = lessonIdx === 0 && stepIdx === 0;
  const isVeryLast = lessonIdx === LESSONS.length - 1 && stepIdx === lesson.steps.length - 1;

  const goNext = () => {
    if (isVeryLast) return onFinishAll();
    if (stepIdx < lesson.steps.length - 1) setStepIdx(stepIdx + 1);
    else {
      setLessonIdx(lessonIdx + 1);
      setStepIdx(0);
    }
    resetStepState();
  };

  const goBack = () => {
    if (isVeryFirst) return onExit();
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
    else {
      const prev = lessonIdx - 1;
      setLessonIdx(prev);
      setStepIdx(LESSONS[prev].steps.length - 1);
    }
    resetStepState();
  };

  const handlePick = (tile: Tile, step: Extract<LessonStep, { kind: "pick" }>) => {
    if (revealed) return;
    if (step.correctKeys.includes(tileKey(tile))) {
      setPickedId(tile.id);
      setRevealed(true);
      setWrong(false);
    } else {
      setPickedId(tile.id);
      setWrong(true);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-emerald-50 to-white">
      {/* Header: progress + lesson chips */}
      <header className="sticky top-0 z-10 flex flex-col gap-2 border-b border-emerald-100 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onExit}
            className="text-xs font-medium text-emerald-700/70 hover:text-emerald-900"
          >
            ✕ Exit
          </button>
          <span className="text-xs font-semibold text-emerald-800">
            Step {globalIndex + 1} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            animate={{ width: `${((globalIndex + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LESSONS.map((l, i) => (
            <span
              key={l.id}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                i === lessonIdx
                  ? "bg-emerald-600 text-white"
                  : i < lessonIdx
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {l.icon} {l.title}
            </span>
          ))}
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${lessonIdx}-${stepIdx}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="flex flex-1 flex-col gap-4"
          >
            <h2 className="text-2xl font-bold text-emerald-950">{step.title}</h2>

            {step.kind === "info" && (
              <>
                <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-gray-700">
                  {step.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <Groups groups={step.groups} />
                {step.callout && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    💡 {step.callout}
                  </div>
                )}
              </>
            )}

            {step.kind === "quiz" && (
              <>
                <p className="text-[15px] leading-relaxed text-gray-700">{step.prompt}</p>
                <Groups groups={step.groups} />
                <div className="flex flex-col gap-2">
                  {step.options.map((opt, i) => {
                    const chosen = selected === i;
                    const showState = selected !== null;
                    const isCorrect = !!opt.correct;
                    return (
                      <button
                        key={i}
                        disabled={showState}
                        onClick={() => {
                          setSelected(i);
                          setRevealed(true);
                        }}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                          showState && isCorrect
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                            : chosen && !isCorrect
                              ? "border-red-400 bg-red-50 text-red-900"
                              : "border-gray-200 bg-white text-gray-800 hover:border-emerald-300"
                        }`}
                      >
                        {opt.tiles && (
                          <span className="flex gap-1">
                            {opt.tiles.map((t) => (
                              <TileFace key={t.id} tile={t} size="sm" animateIn={false} />
                            ))}
                          </span>
                        )}
                        {opt.label && <span>{opt.label}</span>}
                        {showState && isCorrect && <span className="ml-auto">✓</span>}
                        {chosen && !isCorrect && <span className="ml-auto">✗</span>}
                      </button>
                    );
                  })}
                </div>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                  >
                    {step.explanation}
                  </motion.div>
                )}
              </>
            )}

            {step.kind === "pick" && (
              <>
                <p className="text-[15px] leading-relaxed text-gray-700">{step.prompt}</p>
                <Groups groups={step.groups} />
                <div className="flex flex-wrap justify-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  {step.choices.map((t) => {
                    const isPicked = pickedId === t.id;
                    const isRight = step.correctKeys.includes(tileKey(t));
                    return (
                      <motion.div
                        key={t.id}
                        animate={isPicked && wrong ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                        transition={{ duration: 0.35 }}
                        className={`rounded-lg ${
                          revealed && isRight ? "ring-2 ring-emerald-500 ring-offset-2" : ""
                        }`}
                      >
                        <TileFace
                          tile={t}
                          size="md"
                          animateIn={false}
                          onClick={() => handlePick(t, step)}
                        />
                      </motion.div>
                    );
                  })}
                </div>
                {wrong && !revealed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  >
                    Not quite — {step.hint}
                  </motion.div>
                )}
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                  >
                    ✓ {step.explanation}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer nav */}
      <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-emerald-100 bg-white/90 px-4 py-3 backdrop-blur">
        <button
          onClick={goBack}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          {isVeryFirst ? "Back" : "← Back"}
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed}
          className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors ${
            canProceed ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-gray-300"
          }`}
        >
          {isVeryLast ? "Start practice game →" : "Next →"}
        </button>
      </footer>
    </div>
  );
}
