import type { SupabaseClient } from "@supabase/supabase-js";

export interface DieselBalance {
  totalExpected: number;
  totalPaid: number;
  balance: number;
  owedCycles: number;
  aheadCycles: number;
  amountPerUnit: number;
}

export async function getUnitDieselBalance(
  supabase: SupabaseClient,
  unitId: string
): Promise<DieselBalance> {
  const { data: cycles } = await supabase
    .from("diesel_cycles")
    .select("id, cycle_number, amount_per_unit, closed_at")
    .not("closed_at", "is", null);

  const { data: contributions } = await supabase
    .from("diesel_contributions")
    .select("amount_paid, cycle_id")
    .eq("unit_id", unitId);

  const closedCycles = cycles ?? [];
  const totalExpected = closedCycles.reduce(
    (sum, c) => sum + Number(c.amount_per_unit),
    0
  );
  const totalPaid = (contributions ?? []).reduce(
    (sum, c) => sum + Number(c.amount_paid),
    0
  );
  const balance = totalPaid - totalExpected;

  const amountPerUnit =
    closedCycles.length > 0
      ? Number(closedCycles[0].amount_per_unit)
      : 0;

  let owedCycles = 0;
  let aheadCycles = 0;
  if (amountPerUnit > 0) {
    if (balance < 0) {
      owedCycles = Math.ceil(Math.abs(balance) / amountPerUnit);
    } else if (balance > 0) {
      aheadCycles = Math.floor(balance / amountPerUnit);
    }
  }

  return {
    totalExpected,
    totalPaid,
    balance,
    owedCycles,
    aheadCycles,
    amountPerUnit,
  };
}

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}
