import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCbapUser } from "@/lib/cbap/auth";
import { getKnowledgeArea, getTasksByKa } from "@/lib/cbap/content";
import type { KnowledgeAreaId } from "@/lib/cbap/content/types";
import { MarkReviewedButton } from "@/components/cbap/mark-reviewed-button";

export default async function KaDetailPage({ params }: { params: Promise<{ kaId: string }> }) {
  const { kaId } = await params;
  const ka = getKnowledgeArea(kaId as KnowledgeAreaId);
  if (!ka) notFound();

  const user = await requireCbapUser();
  const supabase = await createClient();
  const { data: progressRows } = await supabase
    .from("cbap_item_progress")
    .select("item_id, reviewed")
    .eq("user_id", user.id);
  const reviewedSet = new Set((progressRows ?? []).filter((r) => r.reviewed).map((r) => r.item_id));

  const kaTasks = getTasksByKa(ka.id);

  return (
    <div>
      <h1 className="text-2xl font-bold">{ka.name}</h1>
      <p className="mt-1 text-sm opacity-70">{ka.purpose}</p>
      <div className="mt-6 space-y-6">
        {kaTasks.map((t) => (
          <section key={t.id} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <MarkReviewedButton taskId={t.id} reviewed={reviewedSet.has(t.id)} />
            </div>
            <p className="mt-1 text-sm">{t.purpose}</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div><span className="font-medium">Inputs:</span> {t.inputs.join(", ")}</div>
              <div><span className="font-medium">Outputs:</span> {t.outputs.join(", ")}</div>
              <div className="md:col-span-2"><span className="font-medium">Elements:</span> {t.elements.join(" · ")}</div>
              <div className="md:col-span-2"><span className="font-medium">Stakeholders:</span> {t.stakeholders.join(", ")}</div>
            </div>
            <p className="mt-3 text-sm opacity-80">{t.notes}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
