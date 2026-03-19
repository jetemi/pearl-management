import { createClient } from "@/lib/supabase/server";
import { ServiceChargeView } from "@/components/service-charge/service-charge-view";
import { getUnitServiceChargeStatus } from "@/lib/utils";

export default async function ServiceChargePage() {
  const supabase = await createClient();

  const { data: periods } = await supabase
    .from("service_charge_periods")
    .select("*")
    .order("due_date", { ascending: false });

  const { data: units } = await supabase
    .from("units")
    .select("id, flat_number, owner_name")
    .eq("is_active", true)
    .order("flat_number");

  const unitStatuses = await Promise.all(
    (units ?? []).map(async (unit) => {
      const status = await getUnitServiceChargeStatus(supabase, unit.id);
      return { unit, status };
    })
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Service Charge
      </h1>
      <ServiceChargeView
        periods={periods ?? []}
        units={units ?? []}
        unitStatuses={unitStatuses}
      />
    </div>
  );
}
