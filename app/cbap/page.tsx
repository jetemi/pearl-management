import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { tasks, flashcards } from "@/lib/cbap/content";
import { isoDate } from "@/lib/cbap/srs";

function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso + "T00:00:00").getTime() - new Date(isoDate(new Date()) + "T00:00:00").getTime();
  return Math.round(ms / 86400000);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}

export default async function CbapDashboardPage() {
  const user = await requireCbapUser();
  const supabase = await createClient();
  const today = isoDate(new Date());

  const [{ data: settings }, { data: reviewed }, { data: states }, { data: attempts }] = await Promise.all([
    supabase.from("cbap_settings").select("exam_date").eq("user_id", user.id).maybeSingle(),
    supabase.from("cbap_item_progress").select("item_id").eq("user_id", user.id).eq("reviewed", true),
    supabase.from("cbap_flashcard_state").select("card_id, due_date").eq("user_id", user.id),
    supabase.from("cbap_quiz_attempts").select("score, total, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const tasksReviewed = (reviewed ?? []).length;
  const seen = new Set((states ?? []).map((s) => s.card_id));
  const dueCount = flashcards.filter((c) => { const d = (states ?? []).find((s) => s.card_id === c.id)?.due_date; return d === undefined || d <= today; }).length;
  const examDate = settings?.exam_date ?? null;

  return (
    <div>
      <h1 className="text-2xl font-bold">CBAP Prep</h1>
      {examDate ? (
        <p className="mt-1 text-sm opacity-70">Exam {examDate} — <strong>{daysUntil(examDate)} days</strong> to go</p>
      ) : (
        <p className="mt-1 text-sm">No exam date set. <Link href="/cbap/plan" className="underline">Set one</Link>.</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tasks reviewed" value={`${tasksReviewed}/${tasks.length}`} />
        <Stat label="Cards seen" value={`${seen.size}/${flashcards.length}`} />
        <Stat label="Cards due today" value={String(dueCount)} />
        <Stat label="Quizzes taken" value={String((attempts ?? []).length >= 5 ? "5+" : (attempts ?? []).length)} />
      </div>

      <h2 className="mt-6 font-semibold">Recent quiz scores</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {(attempts ?? []).length === 0 && <li className="opacity-60">No attempts yet.</li>}
        {(attempts ?? []).map((a, idx) => (
          <li key={idx}>{a.created_at.slice(0, 10)} — {a.score}/{a.total} ({Math.round((a.score / a.total) * 100)}%)</li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/cbap/flashcards" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">Review {dueCount} cards</Link>
        <Link href="/cbap/quiz" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">Take a quiz</Link>
        <Link href="/cbap/learn" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">Study notes</Link>
      </div>
    </div>
  );
}
