"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { recordQuizAttempt } from "@/lib/actions/cbap";

export type RunnerQuestion = {
  id: string; stem: string; options: string[]; correctIndex: number; explanation: string;
};

export function QuizRunner({
  questions, mode, kaId, timeLimitSec,
}: { questions: RunnerQuestion[]; mode: "practice" | "mock"; kaId: string | null; timeLimitSec?: number }) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; chosenIndex: number; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const [remaining, setRemaining] = useState(timeLimitSec ?? 0);
  // Lazy-init state captures Date.now() exactly once (safe for purity rule)
  const [startedAt] = useState<number>(() => Date.now());
  const startedAtRef = useRef(startedAt);

  const finish = useCallback(async (final: { questionId: string; chosenIndex: number; correct: boolean }[]) => {
    setDone(true);
    const res = await recordQuizAttempt({
      mode, kaId, durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000), details: final,
    });
    if (!res.success) toast.error(res.error);
  }, [mode, kaId]);

  useEffect(() => {
    if (!timeLimitSec || done) return;
    const t = setInterval(() => setRemaining((r) => (r <= 1 ? 0 : r - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLimitSec, done]);

  useEffect(() => {
    if (timeLimitSec && remaining === 0 && !done) {
      // Defer to avoid synchronous setState-in-effect violation
      const t = setTimeout(() => finish(answers), 0);
      return () => clearTimeout(t);
    }
  }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  if (questions.length === 0) return <p className="mt-6 text-sm">No questions available for this selection yet.</p>;

  if (done || i >= questions.length) {
    const correct = answers.filter((a) => a.correct).length;
    return (
      <div className="mt-6">
        <p className="text-lg font-semibold">Score: {correct} / {questions.length} ({Math.round((correct / questions.length) * 100)}%)</p>
        <p className="mt-1 text-sm opacity-70">Saved to your history.</p>
      </div>
    );
  }

  const q = questions[i];
  const answered = chosen !== null;

  function choose(idx: number) {
    if (mode === "mock") {
      const next = [...answers, { questionId: q.id, chosenIndex: idx, correct: idx === q.correctIndex }];
      setAnswers(next);
      if (i + 1 >= questions.length) finish(next); else setI(i + 1);
    } else {
      setChosen(idx);
    }
  }

  function next() {
    const final = [...answers, { questionId: q.id, chosenIndex: chosen!, correct: chosen === q.correctIndex }];
    setAnswers(final);
    setChosen(null);
    if (i + 1 >= questions.length) finish(final); else setI(i + 1);
  }

  return (
    <div className="mt-6 max-w-2xl">
      <div className="flex items-center justify-between text-xs opacity-60">
        <span>Question {i + 1} / {questions.length}</span>
        {timeLimitSec ? <span>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span> : null}
      </div>
      <p className="mt-2 text-base font-medium">{q.stem}</p>
      <div className="mt-3 space-y-2">
        {q.options.map((opt, idx) => {
          const isCorrect = idx === q.correctIndex;
          const show = mode === "practice" && answered;
          return (
            <button key={idx} disabled={answered} onClick={() => choose(idx)}
              className={`block w-full rounded-md border px-3 py-2 text-left text-sm disabled:cursor-default
                ${show && isCorrect ? "border-green-500 bg-green-500/10" : ""}
                ${show && !isCorrect && chosen === idx ? "border-red-500 bg-red-500/10" : "border-black/15 dark:border-white/20"}`}>
              {opt}
            </button>
          );
        })}
      </div>
      {mode === "practice" && answered && (
        <div className="mt-3">
          <p className="text-sm opacity-80">{q.explanation}</p>
          <button onClick={next} className="mt-3 rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20">
            {i + 1 >= questions.length ? "Finish" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
