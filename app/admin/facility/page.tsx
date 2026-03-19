import { createClient } from "@/lib/supabase/server";
import { FacilityView } from "@/components/facility/facility-view";
import { startOfMonth, subMonths } from "date-fns";

export default async function FacilityPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("facility_services")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const { data: logs } = await supabase
    .from("facility_logs")
    .select("service_id, period_month, status, notes")
    .order("period_month", { ascending: false });

  const logMap = new Map<string, { status: string; notes: string | null }>();
  for (const log of logs ?? []) {
    const key = `${log.service_id}-${log.period_month}`;
    logMap.set(key, { status: log.status, notes: log.notes });
  }

  const today = new Date();
  const monthsToShow = 6;
  const months = Array.from({ length: monthsToShow }, (_, i) =>
    startOfMonth(subMonths(today, i))
  ).reverse();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Facility Accountability
      </h1>
      <FacilityView
        services={services ?? []}
        months={months}
        logMap={logMap}
      />
    </div>
  );
}
