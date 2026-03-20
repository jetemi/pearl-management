import { createClient } from "@/lib/supabase/server";
import { DieselFundView } from "@/components/diesel/diesel-fund-view";
import {
  getDieselPoolTotals,
  getUnitDieselBalance,
} from "@/lib/utils";

export default async function DieselPage() {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("id, flat_number, owner_name, diesel_participates")
    .eq("is_active", true)
    .order("flat_number");

  const participatingUnits =
    units?.filter((u) => u.diesel_participates ?? true) ?? [];
  const participatingIds = participatingUnits.map((u) => u.id);

  const { data: currentCycle } = await supabase
    .from("diesel_cycles")
    .select("*")
    .is("closed_at", null)
    .maybeSingle();

  const { data: pastCycles } = await supabase
    .from("diesel_cycles")
    .select("*")
    .not("closed_at", "is", null)
    .order("cycle_number", { ascending: false })
    .limit(10);

  const unitBalances = await Promise.all(
    participatingUnits.map(async (unit) => {
      const balance = await getUnitDieselBalance(
        supabase,
        unit.id,
        true
      );
      return {
        unit: {
          id: unit.id,
          flat_number: unit.flat_number,
          owner_name: unit.owner_name,
        },
        balance,
      };
    })
  );

  const poolTotals = await getDieselPoolTotals(
    supabase,
    currentCycle?.id ?? null,
    participatingIds
  );

  const { data: recentExpenditures } = await supabase
    .from("diesel_expenditures")
    .select("id, amount, expense_date, notes, cycle_id")
    .order("expense_date", { ascending: false })
    .limit(40);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Diesel Fund
      </h1>
      <DieselFundView
        currentCycle={currentCycle}
        pastCycles={pastCycles ?? []}
        unitBalances={unitBalances}
        poolTotals={poolTotals}
        recentExpenditures={recentExpenditures ?? []}
        activeUnitCount={units?.length ?? 0}
      />
    </div>
  );
}
