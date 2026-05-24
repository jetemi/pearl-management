import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { generatePlan } from "@/lib/cbap/plan";
import { ExamDateForm } from "@/components/cbap/exam-date-form";
import { PlanCheckbox } from "@/components/cbap/plan-checkbox";

export default async function PlanPage() {
  const user = await requireCbapUser();
  const supabase = await createClient();

  const { data: settings } = await supabase.from("cbap_settings").select("exam_date").eq("user_id", user.id).maybeSingle();
  const { data: prog } = await supabase.from("cbap_plan_progress").select("task_key, done").eq("user_id", user.id);
  const doneSet = new Set((prog ?? []).filter((p) => p.done).map((p) => p.task_key));

  const examDate = settings?.exam_date ?? null;
  const weeks = generatePlan(examDate ?? new Date().toISOString().slice(0, 10));

  return (
    <div>
      <h1 className="text-2xl font-bold">Study Plan</h1>
      <p className="mt-1 text-sm opacity-70">12-week intensive track. Set your exam date to anchor the schedule.</p>
      <div className="mt-4"><ExamDateForm current={examDate} /></div>
      <div className="mt-6 space-y-4">
        {weeks.map((w) => (
          <section key={w.week} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h2 className="font-semibold">Week {w.week} — {w.theme}</h2>
            <p className="text-xs opacity-60">Starts {w.startDate}</p>
            <div className="mt-2 space-y-1">
              {w.items.map((it) => (
                <PlanCheckbox key={it.key} taskKey={it.key} label={it.label} initialDone={doneSet.has(it.key)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
