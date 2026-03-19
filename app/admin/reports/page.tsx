import { createClient } from "@/lib/supabase/server";
import { ReportsView } from "@/components/reports/reports-view";
import {
  getUnitDieselBalance,
  getUnitServiceChargeStatus,
} from "@/lib/utils";
import { startOfMonth, format } from "date-fns";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("id, flat_number, owner_name")
    .eq("is_active", true)
    .order("flat_number");

  const { data: dieselCycles } = await supabase
    .from("diesel_cycles")
    .select("*")
    .order("cycle_number", { ascending: false });

  const { data: serviceChargePeriods } = await supabase
    .from("service_charge_periods")
    .select("*")
    .order("due_date", { ascending: false });

  const { data: facilityServices } = await supabase
    .from("facility_services")
    .select("id, name")
    .eq("is_active", true);

  const { data: facilityLogs } = await supabase
    .from("facility_logs")
    .select("service_id, period_month, status");

  const dieselReport = await Promise.all(
    (units ?? []).map(async (unit) => {
      const balance = await getUnitDieselBalance(supabase, unit.id);
      return {
        flat_number: unit.flat_number,
        owner_name: unit.owner_name,
        totalExpected: balance.totalExpected,
        totalPaid: balance.totalPaid,
        balance: balance.balance,
        owedCycles: balance.owedCycles,
        aheadCycles: balance.aheadCycles,
      };
    })
  );

  const serviceChargeReport = await Promise.all(
    (serviceChargePeriods ?? []).map(async (period) => {
      const unitStatuses = await Promise.all(
        (units ?? []).map(async (unit) => {
          const status = await getUnitServiceChargeStatus(supabase, unit.id);
          const s = status.find((sp) => sp.periodId === period.id);
          return {
            flat_number: unit.flat_number,
            owner_name: unit.owner_name,
            paid: s?.paid ?? false,
            amountPaid: s?.amountPaid ?? 0,
          };
        })
      );
      return {
        period,
        unitStatuses,
      };
    })
  );

  const today = new Date();
  const recentMonths = [0, 1, 2].map((i) =>
    format(startOfMonth(new Date(today.getFullYear(), today.getMonth() - i, 1)), "yyyy-MM-dd")
  );

  const facilityReport = (facilityServices ?? []).map((svc) => {
    const logsForService = (facilityLogs ?? []).filter(
      (l) => l.service_id === svc.id && recentMonths.includes(l.period_month)
    );
    const doneCount = logsForService.filter((l) => l.status === "done").length;
    const total = recentMonths.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    return {
      serviceName: svc.name,
      doneCount,
      total,
      pct,
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Reports
      </h1>
      <ReportsView
        dieselReport={dieselReport}
        dieselCycles={dieselCycles ?? []}
        serviceChargeReport={serviceChargeReport}
        facilityReport={facilityReport}
      />
    </div>
  );
}
