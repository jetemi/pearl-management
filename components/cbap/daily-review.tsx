"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { recordDailyAnswer, finishDailyReview } from "@/lib/actions/cbap";

export type DailyQuestion = {
  id: string;
  kaId: string;
  kaName: string;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
  taskId?: string;
  taskName?: string;
  taskNote?: string;
  caseStudyTitle?: string;
  caseStudyScenario?: string;
  /** True when this question is coming back on the spaced-repetition schedule. */
  isReview: boolean;
};

type Answered = { questionId: string; correct: boolean };

export function DailyReview({
  questions,
  alreadyDone,
  target,
}: {
  questions: DailyQuestion[];
  alreadyDone: number;
  target: number;
}) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [missed, setMissed] = useState<DailyQuestion[]>([]);
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showScenario, setShowScenario] = useState(true);
  const [startedAt] = useState<number>(() => Date.now());

  if (questions.length === 0) {
    // Two different reasons for an empty set: the day's target is met, or the
    // whole bank is answered and nothing has come due yet.
    const targetMet = alreadyDone > 0;
    return (
      <div className="mt-6 rounded-lg border border-black/10 p-5 dark:border-white/15">
        <p className="text-lg font-semibold">
          {targetMet ? "Today's review is done ✅" : "Nothing due today ✅"}
        </p>
        <p className="mt-1 text-sm opacity-70">
          {targetMet
            ? `${alreadyDone} of ${target} questions answered. Come back tomorrow — missed questions return soonest.`
            : "You've answered every question in the bank and none are due for repeat yet. Take a mock exam or work the flashcards."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/cbap/quiz" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
            Extra practice
          </Link>
          <Link href="/cbap/flashcards" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
            Flashcards
          </Link>
        </div>
      </div>
    );
  }

  const finished = i >= questions.length;

  if (finished) {
    const correct = answers.filter((a) => a.correct).length;
    const pct = Math.round((correct / answers.length) * 100);
    return (
      <div className="mt-6 max-w-2xl">
        <div className="rounded-lg border border-black/10 p-5 dark:border-white/15">
          <p className="text-2xl font-bold">
            {correct} / {answers.length} <span className="text-base font-normal opacity-70">({pct}%)</span>
          </p>
          <p className="mt-1 text-sm opacity-70">
            {pct >= 75
              ? "Above the working target for exam readiness. Keep the streak."
              : "Below 75%. The ones you missed are scheduled to come back tomorrow."}
          </p>
        </div>

        {missed.length > 0 && (
          <div className="mt-4">
            <h2 className="font-semibold">Review these ({missed.length})</h2>
            <ul className="mt-2 space-y-2">
              {missed.map((q) => (
                <li key={q.id} className="rounded-md border border-black/10 p-3 text-sm dark:border-white/15">
                  <div className="text-xs opacity-60">
                    {q.kaName}
                    {q.taskName ? ` · ${q.taskName}` : ""}
                  </div>
                  <p className="mt-1">{q.stem}</p>
                  <p className="mt-1 font-medium text-green-700 dark:text-green-400">
                    {q.options[q.correctIndex]}
                  </p>
                  <p className="mt-1 opacity-75">{q.explanation}</p>
                  {q.taskId && (
                    <Link href={`/cbap/learn/${q.kaId}`} className="mt-1 inline-block text-xs underline opacity-70">
                      Study {q.taskName ?? q.kaName}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link href="/cbap" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
            Dashboard
          </Link>
          <Link href="/cbap/quiz" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
            More practice
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[i];
  const answered = chosen !== null;
  const wasCorrect = chosen === q.correctIndex;
  const position = alreadyDone + i + 1;

  async function choose(idx: number) {
    if (answered || saving) return;
    setChosen(idx);
    setSaving(true);

    const correct = idx === q.correctIndex;
    const res = await recordDailyAnswer({ questionId: q.id, chosenIndex: idx, correct });
    setSaving(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setNextDue(res.intervalDays === 1 ? "tomorrow" : `in ${res.intervalDays} days`);
    setAnswers((a) => [...a, { questionId: q.id, correct }]);
    if (!correct) setMissed((m) => [...m, q]);
  }

  async function next() {
    const isLast = i + 1 >= questions.length;
    if (isLast) {
      const correct = answers.filter((a) => a.correct).length;
      await finishDailyReview(correct, answers.length, Math.round((Date.now() - startedAt) / 1000));
    }
    setChosen(null);
    setNextDue(null);
    setShowScenario(true);
    setI(i + 1);
  }

  return (
    <div className="mt-5 max-w-2xl">
      <div className="flex items-center justify-between text-xs opacity-60">
        <span>
          Question {position} of {target}
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-black/15 px-2 py-0.5 dark:border-white/20">
            {q.isReview ? "Review" : "New"}
          </span>
          <span className="capitalize">{q.difficulty}</span>
          <span>{q.kaName}</span>
        </span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div
          className="h-full bg-black/60 transition-all dark:bg-white/70"
          style={{ width: `${(position / target) * 100}%` }}
        />
      </div>

      {q.caseStudyScenario && (
        <div className="mt-4 rounded-lg border border-black/10 bg-black/[.03] p-3 dark:border-white/15 dark:bg-white/[.04]">
          <button
            onClick={() => setShowScenario((s) => !s)}
            className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide opacity-70"
          >
            <span>Case study — {q.caseStudyTitle}</span>
            <span>{showScenario ? "Hide" : "Show"}</span>
          </button>
          {showScenario && <p className="mt-2 text-sm leading-relaxed">{q.caseStudyScenario}</p>}
        </div>
      )}

      <p className="mt-4 text-base font-medium leading-relaxed">{q.stem}</p>

      <div className="mt-3 space-y-2">
        {q.options.map((opt, idx) => {
          const isCorrect = idx === q.correctIndex;
          const isChosen = chosen === idx;
          let cls = "border-black/15 dark:border-white/20";
          if (answered && isCorrect) cls = "border-green-600 bg-green-500/10";
          else if (answered && isChosen) cls = "border-red-600 bg-red-500/10";
          else if (answered) cls = "border-black/10 opacity-55 dark:border-white/10";

          return (
            <button
              key={idx}
              disabled={answered || saving}
              onClick={() => choose(idx)}
              className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default ${cls} ${
                !answered ? "hover:bg-black/5 dark:hover:bg-white/10" : ""
              }`}
            >
              <span className="mt-0.5 shrink-0 font-mono text-xs opacity-50">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{opt}</span>
              {answered && isCorrect && <span className="shrink-0 text-green-700 dark:text-green-400">✓</span>}
              {answered && isChosen && !isCorrect && <span className="shrink-0 text-red-700 dark:text-red-400">✕</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`mt-4 rounded-lg border p-4 ${
            wasCorrect
              ? "border-green-600/40 bg-green-500/5"
              : "border-red-600/40 bg-red-500/5"
          }`}
        >
          <p className="text-sm font-semibold">
            {wasCorrect ? "Correct" : `Not quite — the answer is ${String.fromCharCode(65 + q.correctIndex)}`}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{q.explanation}</p>

          {q.taskName && (
            <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/15">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                BABOK · {q.kaName} · {q.taskName}
              </p>
              {q.taskNote && <p className="mt-1 text-sm leading-relaxed opacity-80">{q.taskNote}</p>}
              <Link href={`/cbap/learn/${q.kaId}`} className="mt-1 inline-block text-xs underline opacity-70">
                Open study notes
              </Link>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={next}
              className="rounded-md border border-black/20 bg-black/5 px-4 py-2 text-sm font-medium hover:bg-black/10 dark:border-white/25 dark:bg-white/10 dark:hover:bg-white/15"
            >
              {i + 1 >= questions.length ? "Finish" : "Next question"}
            </button>
            {nextDue && <span className="text-xs opacity-60">Returns {nextDue}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
