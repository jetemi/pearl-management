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

  const { data: unitsAll } = await supabase
    .from("units")
    .select("id, flat_number, owner_name, email, is_active")
    .order("flat_number");

  const activeUnits =
    unitsAll
      ?.filter((u) => u.is_active !== false)
      .map((u) => ({
        id: u.id,
        flat_number: u.flat_number,
        owner_name: u.owner_name,
        email: u.email,
      })) ?? [];

  const inactiveUnits = (unitsAll ?? []).filter((u) => u.is_active === false);

  // Former residents (is_active = false) with outstanding obligations or existing payments
  // should stay visible so committee can continue to track and collect from them.
  let formerResidentUnits: typeof activeUnits = [];
  if (inactiveUnits.length > 0) {
    const inactiveIds = inactiveUnits.map((u) => u.id);
    const [{ data: ob }, { data: pay }] = await Promise.all([
      supabase
        .from("service_charge_obligations")
        .select("unit_id")
        .in("unit_id", inactiveIds),
      supabase
        .from("service_charge_payments")
        .select("unit_id")
        .in("unit_id", inactiveIds),
    ]);
    const withHistory = new Set<string>();
    for (const r of ob ?? []) withHistory.add(r.unit_id);
    for (const r of pay ?? []) withHistory.add(r.unit_id);
    formerResidentUnits = inactiveUnits
      .filter((u) => withHistory.has(u.id))
      .map((u) => ({
        id: u.id,
        flat_number: u.flat_number,
        owner_name: u.owner_name,
        email: u.email,
      }));
  }

  const unitsForStatus = [...activeUnits, ...formerResidentUnits];

  const { data: obligationRows } = await supabase
    .from("service_charge_obligations")
    .select(
      "id, unit_id, label, amount, period_start, period_end, period_template_id, units(flat_number, owner_name, is_active)"
    );

  const obligationOptions =
    obligationRows
      ?.filter((o) => {
        // Keep options for active units AND former residents with history (so
        // the committee can still record late payments).
        const u = unitRowFromJoin(o.units);
        return u?.is_active !== false || formerResidentUnits.some((f) => f.id === o.unit_id);
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

  const formerResidentIds = new Set(formerResidentUnits.map((u) => u.id));

  const unitStatuses = await Promise.all(
    unitsForStatus.map(async (unit) => {
      const status = await getUnitServiceChargeStatus(supabase, unit.id);
      return {
        unit: {
          id: unit.id,
          flat_number: unit.flat_number,
          owner_name: unit.owner_name,
          isFormerResident: formerResidentIds.has(unit.id),
        },
        status,
      };
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
        units={activeUnits}
        unitStatuses={unitStatuses}
        unitsWithEmail={activeUnits}
      />
    </div>
  );
}
