import { createClient } from "@/lib/supabase/server";
import { DieselFundView } from "@/components/diesel/diesel-fund-view";
import { getUnitDieselBalance } from "@/lib/utils";

export default async function DieselPage() {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from("units")
    .select("id, flat_number, owner_name")
    .eq("is_active", true)
    .order("flat_number");

  const { data: currentCycle } = await supabase
    .from("diesel_cycles")
    .select("*")
    .is("closed_at", null)
    .single();

  const { data: pastCycles } = await supabase
    .from("diesel_cycles")
    .select("*")
    .not("closed_at", "is", null)
    .order("cycle_number", { ascending: false })
    .limit(10);

  const unitBalances = await Promise.all(
    (units ?? []).map(async (unit) => {
      const balance = await getUnitDieselBalance(supabase, unit.id);
      return { unit, balance };
    })
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Diesel Fund
      </h1>
      <DieselFundView
        currentCycle={currentCycle}
        pastCycles={pastCycles ?? []}
        unitBalances={unitBalances}
      />
    </div>
  );
}
