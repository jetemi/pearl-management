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
    .select("id, cycle_number, amount_per_unit, closed_at");

  const { data: contributions } = await supabase
    .from("diesel_contributions")
    .select("amount_paid, cycle_id")
    .eq("unit_id", unitId);

  const allCycles = cycles ?? [];
  const totalExpected = allCycles.reduce(
    (sum, c) => sum + Number(c.amount_per_unit),
    0
  );
  const totalPaid = (contributions ?? []).reduce(
    (sum, c) => sum + Number(c.amount_paid),
    0
  );
  const balance = totalPaid - totalExpected;

  const amountPerUnit =
    allCycles.length > 0
      ? Number(allCycles[0].amount_per_unit)
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

export interface ServiceChargePeriodStatus {
  periodId: string;
  periodLabel: string;
  amountPerUnit: number;
  dueDate: string | null;
  paid: boolean;
  amountPaid: number;
  paymentDate: string | null;
}

export async function getUnitServiceChargeStatus(
  supabase: SupabaseClient,
  unitId: string
): Promise<ServiceChargePeriodStatus[]> {
  const { data: periods } = await supabase
    .from("service_charge_periods")
    .select("id, period_label, amount_per_unit, due_date")
    .order("due_date", { ascending: true });

  const { data: payments } = await supabase
    .from("service_charge_payments")
    .select("period_id, amount_paid, payment_date")
    .eq("unit_id", unitId);

  const paymentMap = new Map(
    (payments ?? []).map((p) => [p.period_id, p])
  );

  return (periods ?? []).map((period) => {
    const payment = paymentMap.get(period.id);
    return {
      periodId: period.id,
      periodLabel: period.period_label,
      amountPerUnit: Number(period.amount_per_unit),
      dueDate: period.due_date,
      paid: !!payment,
      amountPaid: payment ? Number(payment.amount_paid) : 0,
      paymentDate: payment?.payment_date ?? null,
    };
  });
}

export function exportToCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const header = columns.map((c) => c.header).join(",");
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const body = rows
    .map((row) =>
      columns.map((c) => escape(row[c.key])).join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}
