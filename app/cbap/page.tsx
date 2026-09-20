import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { tasks, flashcards, questions } from "@/lib/cbap/content";
import { isoDate } from "@/lib/cbap/srs";
import { computeStreak, DEFAULT_DAILY_TARGET } from "@/lib/cbap/daily";

export const dynamic = "force-dynamic";

function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso + "T00:00:00").getTime() - new Date(isoDate(new Date()) + "T00:00:00").getTime();
  return Math.round(ms / 86400000);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] opacity-50">{hint}</div>}
    </div>
  );
}

export default async function CbapDashboardPage() {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const today = isoDate(new Date());

  const [
    { data: settings },
    { data: reviewed },
    { data: states },
    { data: attempts },
    { data: qStates },
    { data: todayLog },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from("cbap_settings").select("exam_date, daily_target").eq("user_id", user.id).maybeSingle(),
    supabase.from("cbap_item_progress").select("item_id").eq("user_id", user.id).eq("reviewed", true),
    supabase.from("cbap_flashcard_state").select("card_id, due_date").eq("user_id", user.id),
    supabase.from("cbap_quiz_attempts").select("score, total, mode, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("cbap_question_state").select("question_id, due_date, repetitions").eq("user_id", user.id),
    supabase.from("cbap_daily_log").select("answered, correct, target").eq("user_id", user.id).eq("review_date", today).maybeSingle(),
    supabase.from("cbap_daily_log").select("review_date").eq("user_id", user.id).order("review_date", { ascending: false }).limit(400),
  ]);

  const tasksReviewed = (reviewed ?? []).length;
  const seenCards = new Set((states ?? []).map((s) => s.card_id));
  const dueCards = flashcards.filter((c) => {
    const d = (states ?? []).find((s) => s.card_id === c.id)?.due_date;
    return d === undefined || d <= today;
  }).length;

  const examDate = settings?.exam_date ?? null;
  const target = todayLog?.target ?? settings?.daily_target ?? DEFAULT_DAILY_TARGET;
  const answeredToday = todayLog?.answered ?? 0;
  const streak = computeStreak((recentLogs ?? []).map((l) => l.review_date), today);

  const questionsSeen = (qStates ?? []).length;
  const questionsMastered = (qStates ?? []).filter((s) => s.repetitions >= 3).length;
  const questionsDue = (qStates ?? []).filter((s) => s.due_date <= today).length;

  const dailyDone = answeredToday >= target;
  const remaining = Math.max(0, target - answeredToday);

  return (
    <div>
      <h1 className="text-2xl font-bold">CBAP Prep</h1>
      {examDate ? (
        <p className="mt-1 text-sm opacity-70">
          Exam {examDate} — <strong>{daysUntil(examDate)} days</strong> to go
        </p>
      ) : (
        <p className="mt-1 text-sm">
          No exam date set. <Link href="/cbap/plan" className="underline">Set one</Link>.
        </p>
      )}

      {/* Today's review is the primary call to action. */}
      <div
        className={`mt-5 rounded-lg border p-5 ${
          dailyDone
            ? "border-green-600/40 bg-green-500/5"
            : "border-black/15 bg-black/[.03] dark:border-white/20 dark:bg-white/[.05]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              {dailyDone ? "Today's review complete ✅" : `Today's review — ${remaining} left`}
            </p>
            <p className="mt-0.5 text-sm opacity-70">
              {answeredToday}/{target} answered
              {streak > 0 && ` · ${streak}-day streak`}
              {questionsDue > 0 && !dailyDone && ` · ${questionsDue} due for repeat`}
            </p>
          </div>
          <Link
            href="/cbap/daily"
            className="rounded-md border border-black/20 bg-black/5 px-4 py-2 text-sm font-medium hover:bg-black/10 dark:border-white/25 dark:bg-white/10 dark:hover:bg-white/15"
          >
            {dailyDone ? "Review again" : answeredToday > 0 ? "Continue" : "Start"}
          </Link>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
          <div
            className={`h-full transition-all ${dailyDone ? "bg-green-600" : "bg-black/60 dark:bg-white/70"}`}
            style={{ width: `${Math.min(100, (answeredToday / target) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Day streak" value={String(streak)} />
        <Stat
          label="Question bank seen"
          value={`${questionsSeen}/${questions.length}`}
          hint={`${questionsMastered} mastered`}
        />
        <Stat label="Tasks reviewed" value={`${tasksReviewed}/${tasks.length}`} />
        <Stat label="Cards due today" value={String(dueCards)} hint={`${seenCards.size}/${flashcards.length} seen`} />
      </div>

      <h2 className="mt-6 font-semibold">Recent scores</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {(attempts ?? []).length === 0 && <li className="opacity-60">No attempts yet.</li>}
        {(attempts ?? []).map((a, idx) => (
          <li key={idx}>
            <span className="opacity-60">{a.created_at.slice(0, 10)}</span> · {a.mode} · {a.score}/{a.total} (
            {Math.round((a.score / a.total) * 100)}%)
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/cbap/flashcards" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
          Review {dueCards} cards
        </Link>
        <Link href="/cbap/quiz" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
          Take a quiz
        </Link>
        <Link href="/cbap/learn" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
          Study notes
        </Link>
      </div>
    </div>
  );
}
