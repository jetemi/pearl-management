import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { questions, getKnowledgeArea, getTaskById, getCaseStudyById } from "@/lib/cbap/content";
import { isoDate } from "@/lib/cbap/srs";
import { buildDailySet, computeStreak, DEFAULT_DAILY_TARGET, type QuestionState } from "@/lib/cbap/daily";
import { DailyReview, type DailyQuestion } from "@/components/cbap/daily-review";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] opacity-50">{hint}</div>}
    </div>
  );
}

export default async function DailyPage() {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const today = isoDate(new Date());

  const [{ data: settings }, { data: stateRows }, { data: todayLog }, { data: recentLogs }] =
    await Promise.all([
      supabase.from("cbap_settings").select("daily_question_goal, exam_date").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("cbap_question_state")
        .select("question_id, ease, interval_days, repetitions, due_date, times_seen, times_correct")
        .eq("user_id", user.id),
      supabase
        .from("cbap_daily_log")
        .select("answered, correct, answered_ids, target")
        .eq("user_id", user.id)
        .eq("review_date", today)
        .maybeSingle(),
      supabase
        .from("cbap_daily_log")
        .select("review_date")
        .eq("user_id", user.id)
        .order("review_date", { ascending: false })
        .limit(400),
    ]);

  const target = todayLog?.target ?? settings?.daily_question_goal ?? DEFAULT_DAILY_TARGET;

  const states: QuestionState[] = (stateRows ?? []).map((r) => ({
    questionId: r.question_id,
    ease: Number(r.ease),
    intervalDays: r.interval_days,
    repetitions: r.repetitions,
    dueDate: r.due_date,
    timesSeen: r.times_seen,
    timesCorrect: r.times_correct,
  }));

  const answeredToday: string[] = todayLog?.answered_ids ?? [];

  const set = buildDailySet({
    all: questions,
    states,
    today,
    target,
    seed: `${user.id}:${today}`,
    excludeIds: answeredToday,
  });

  const stateById = new Map(states.map((s) => [s.questionId, s]));

  const dailyQuestions: DailyQuestion[] = set.questions.map((q) => {
    const task = q.taskId ? getTaskById(q.taskId) : undefined;
    const cs = q.caseStudyId ? getCaseStudyById(q.caseStudyId) : undefined;
    return {
      id: q.id,
      kaId: q.kaId,
      kaName: getKnowledgeArea(q.kaId)?.name ?? q.kaId,
      stem: q.stem,
      options: q.options as unknown as string[],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      taskId: q.taskId,
      taskName: task?.name,
      taskNote: task?.notes,
      caseStudyTitle: cs?.title,
      caseStudyScenario: cs?.scenario,
      isReview: stateById.has(q.id),
    };
  });

  const streak = computeStreak((recentLogs ?? []).map((l) => l.review_date), today);
  const mastered = states.filter((s) => s.repetitions >= 3).length;
  const seen = states.length;

  const daysToExam = settings?.exam_date
    ? Math.round(
        (new Date(settings.exam_date + "T00:00:00").getTime() -
          new Date(today + "T00:00:00").getTime()) /
          86400000
      )
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Daily review</h1>
        <p className="text-sm opacity-70">
          {today}
          {daysToExam !== null && ` · ${daysToExam} days to exam`}
        </p>
      </div>
      <p className="mt-1 text-sm opacity-70">
        {target} questions a day. Answer, read the explanation, move on — questions you miss come
        back soonest.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Day streak" value={String(streak)} hint={streak > 0 ? "keep it going" : "start today"} />
        <Stat label="Answered today" value={`${answeredToday.length}/${target}`} />
        <Stat label="Bank covered" value={`${seen}/${questions.length}`} hint={`${mastered} mastered`} />
        <Stat
          label="Due for review"
          value={String(set.reviewCount + set.backlog)}
          hint={set.backlog > 0 ? `${set.backlog} beyond today` : "all fit today"}
        />
      </div>

      {set.backlog > 0 && (
        <p className="mt-3 rounded-md border border-amber-600/40 bg-amber-500/5 px-3 py-2 text-sm">
          {set.backlog} due {set.backlog === 1 ? "question is" : "questions are"} queued beyond
          today&apos;s {target}. Raise your daily target on the{" "}
          <Link href="/cbap/plan" className="underline">
            study plan
          </Link>{" "}
          to clear the backlog faster.
        </p>
      )}

      <DailyReview questions={dailyQuestions} alreadyDone={answeredToday.length} target={target} />

      <p className="mt-8 text-xs opacity-50">
        Original practice items written against the published BABOK v3 structure. Not real exam
        questions — use alongside the BABOK Guide itself and your accredited training.
      </p>
    </div>
  );
}
