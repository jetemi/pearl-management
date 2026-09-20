"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { reviewCard, defaultSrsState, isoDate, type SrsState } from "@/lib/cbap/srs";
import { gradeForAnswer, DEFAULT_DAILY_TARGET } from "@/lib/cbap/daily";

export async function markItemReviewed(itemId: string, itemType: "task" | "ka") {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("cbap_item_progress")
    .upsert(
      { user_id: user.id, item_id: itemId, item_type: itemType, reviewed: true, reviewed_at: new Date().toISOString() },
      { onConflict: "user_id,item_id" }
    );
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/cbap/learn");
  return { success: true as const };
}

export async function upsertFlashcardReview(cardId: string, grade: number) {
  const user = await requireCbapUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("cbap_flashcard_state")
    .select("ease, interval_days, repetitions, due_date")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .maybeSingle();

  const prev: SrsState = existing
    ? {
        ease: Number(existing.ease),
        intervalDays: existing.interval_days,
        repetitions: existing.repetitions,
        dueDate: existing.due_date,
      }
    : defaultSrsState();

  const next = reviewCard(prev, grade);

  const { error } = await supabase.from("cbap_flashcard_state").upsert(
    {
      user_id: user.id,
      card_id: cardId,
      ease: next.ease,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      due_date: next.dueDate,
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,card_id" }
  );
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, dueDate: next.dueDate };
}

type QuizDetail = { questionId: string; chosenIndex: number; correct: boolean };

export async function recordQuizAttempt(input: {
  mode: "practice" | "mock";
  kaId: string | null;
  durationSeconds: number;
  details: QuizDetail[];
}) {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const total = input.details.length;
  const score = input.details.filter((d) => d.correct).length;

  const { error } = await supabase.from("cbap_quiz_attempts").insert({
    user_id: user.id,
    mode: input.mode,
    ka_id: input.kaId,
    score,
    total,
    duration_seconds: input.durationSeconds,
    details: input.details,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, score, total };
}

export async function setExamDate(examDate: string) {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const { error } = await supabase.from("cbap_settings").upsert(
    { user_id: user.id, exam_date: examDate, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/cbap");
  revalidatePath("/cbap/plan");
  return { success: true as const };
}

export async function togglePlanItem(taskKey: string, done: boolean) {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const { error } = await supabase.from("cbap_plan_progress").upsert(
    { user_id: user.id, task_key: taskKey, done, done_at: done ? new Date().toISOString() : null },
    { onConflict: "user_id,task_key" }
  );
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/cbap/plan");
  return { success: true as const };
}

/**
 * Record one answer in the daily review.
 *
 * Two writes, both idempotent per question per day:
 *  1. The question's SM-2 state — a miss resets it to a 1-day interval, a hit
 *     pushes it out along the ease curve.
 *  2. The day's log row, which drives the streak and lets a part-finished
 *     session resume without re-serving questions already answered.
 */
export async function recordDailyAnswer(input: {
  questionId: string;
  chosenIndex: number;
  correct: boolean;
}) {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const today = isoDate(new Date());

  const { data: existing } = await supabase
    .from("cbap_question_state")
    .select("ease, interval_days, repetitions, due_date, times_seen, times_correct")
    .eq("user_id", user.id)
    .eq("question_id", input.questionId)
    .maybeSingle();

  const prev: SrsState = existing
    ? {
        ease: Number(existing.ease),
        intervalDays: existing.interval_days,
        repetitions: existing.repetitions,
        dueDate: existing.due_date,
      }
    : defaultSrsState();

  const next = reviewCard(prev, gradeForAnswer(input.correct));

  const { error: stateError } = await supabase.from("cbap_question_state").upsert(
    {
      user_id: user.id,
      question_id: input.questionId,
      ease: next.ease,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      due_date: next.dueDate,
      times_seen: (existing?.times_seen ?? 0) + 1,
      times_correct: (existing?.times_correct ?? 0) + (input.correct ? 1 : 0),
      last_answered_at: new Date().toISOString(),
    },
    { onConflict: "user_id,question_id" }
  );
  if (stateError) return { success: false as const, error: stateError.message };

  const { data: log } = await supabase
    .from("cbap_daily_log")
    .select("target, answered, correct, answered_ids")
    .eq("user_id", user.id)
    .eq("review_date", today)
    .maybeSingle();

  // Re-answering the same question within a day must not inflate the count.
  const answeredIds: string[] = log?.answered_ids ?? [];
  if (!answeredIds.includes(input.questionId)) {
    const target = log?.target ?? DEFAULT_DAILY_TARGET;
    const answered = (log?.answered ?? 0) + 1;

    const { error: logError } = await supabase.from("cbap_daily_log").upsert(
      {
        user_id: user.id,
        review_date: today,
        target,
        answered,
        correct: (log?.correct ?? 0) + (input.correct ? 1 : 0),
        answered_ids: [...answeredIds, input.questionId],
        completed_at: answered >= target ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,review_date" }
    );
    if (logError) return { success: false as const, error: logError.message };
  }

  return { success: true as const, dueDate: next.dueDate, intervalDays: next.intervalDays };
}

/** Called once the day's target is met, so the dashboard reflects it immediately. */
export async function finishDailyReview(score: number, total: number, durationSeconds: number) {
  const user = await requireCbapUser();
  const supabase = await createClient();

  // `details` is NOT NULL DEFAULT '[]' in 013 — per-question results are already
  // in cbap_question_state, so this row is the daily summary only.
  const { error } = await supabase.from("cbap_quiz_attempts").insert({
    user_id: user.id,
    mode: "daily",
    ka_id: null,
    score,
    total,
    duration_seconds: durationSeconds,
    details: [],
  });
  if (error) return { success: false as const, error: error.message };

  revalidatePath("/cbap");
  revalidatePath("/cbap/daily");
  return { success: true as const };
}

/** Change how many questions the daily review serves. */
export async function setDailyTarget(target: number) {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const clamped = Math.max(5, Math.min(60, Math.round(target)));

  const { error } = await supabase.from("cbap_settings").upsert(
    { user_id: user.id, daily_question_goal: clamped, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return { success: false as const, error: error.message };

  revalidatePath("/cbap");
  revalidatePath("/cbap/daily");
  return { success: true as const, target: clamped };
}
