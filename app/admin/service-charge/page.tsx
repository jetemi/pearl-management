import { createClient } from "@/lib/supabase/server";
import { ServiceChargeView } from "@/components/service-charge/service-charge-view";
import { getUnitServiceChargeStatus } from "@/lib/utils";

function unitRowFromJoin(
  units:
    | { flat_number: string; owner_name: string; is_active: boolean }
    | { flat_number: string; owner_name: string; is_active: boolean }[]
    | null
    | undefined
): { flat_number: string; owner_name: string; is_active: boolean } | null {
  if (!units) return null;
  if (Array.isArray(units)) return units[0] ?? null;
  return units;
}

export default async function ServiceChargePage() {
  const supabase = await createClient();

  const { data: periods } = await supabase
    .from("service_charge_periods")
    .select("*")
    .order("due_date", { ascending: false });

  const { data: units } = await supabase
    .from("units")
    .select("id, flat_number, owner_name, email")
    .eq("is_active", true)
    .order("flat_number");

  const { data: obligationRows } = await supabase
    .from("service_charge_obligations")
    .select(
      "id, unit_id, label, amount, period_start, period_end, period_template_id, units(flat_number, owner_name, is_active)"
    );

  const obligationOptions =
    obligationRows
      ?.filter((o) => {
        const u = unitRowFromJoin(o.units);
        return u?.is_active !== false;
      })
      .map((o) => {
        const u = unitRowFromJoin(o.units);
        if (!u) return null;
        return {
          id: o.id,
          unit_id: o.unit_id,
          label: o.label,
          amount: Number(o.amount),
          period_start: o.period_start,
          period_end: o.period_end,
          period_template_id: o.period_template_id,
          flat_number: u.flat_number,
          owner_name: u.owner_name,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null) ?? [];

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
        templates={periods ?? []}
        obligationOptions={obligationOptions}
        units={units ?? []}
        unitStatuses={unitStatuses}
        unitsWithEmail={units ?? []}
      />
    </div>
  );
}
