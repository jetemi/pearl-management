import type { SupabaseClient } from "@supabase/supabase-js";

/** Normalize Supabase joined `units` (object or single-element array). */
export function flatNumberFromUnitsJoin(
  units: { flat_number: string } | { flat_number: string }[] | null | undefined
): string {
  if (!units) return "—";
  if (Array.isArray(units)) return units[0]?.flat_number ?? "—";
  return units.flat_number ?? "—";
}

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

export function generateWhatsAppDieselMessage(
  cycleNumber: number,
  defaulters: { flat: string; owedCycles: number; owedAmount: number }[],
  bankDetails: string,
  paidFlats: string[]
) {
  const estateName =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ESTATE_NAME
      ? process.env.NEXT_PUBLIC_ESTATE_NAME
      : "Estate";
  const lines = [
    `🏘️ *${estateName} — Diesel Fund Cycle ${cycleNumber}*`,
    "",
    defaulters.length === 0
      ? "✅ All units have paid. Thank you!"
      : `⚠️ *Outstanding (${defaulters.length} units):*`,
    ...defaulters.map(
      (d) =>
        `- ${d.flat}: ${d.owedCycles} cycle(s) = ₦${d.owedAmount.toLocaleString()}`
    ),
    defaulters.length > 0 ? "" : null,
    paidFlats.length > 0 && defaulters.length > 0
      ? `✅ Paid: ${paidFlats.join(", ")}`
      : null,
    "",
    `Please pay to: ${bankDetails}`,
    "",
    "Thank you 🙏",
  ].filter(Boolean);
  const message = lines.join("\n");
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Plain-text body for WhatsApp (same for every FM). */
export function buildFacilityRequestWhatsAppMessageText(
  title: string,
  body: string,
  requestUrl: string
): string {
  const estateName =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ESTATE_NAME
      ? process.env.NEXT_PUBLIC_ESTATE_NAME
      : "Estate";
  const maxBody = 1200;
  const bodyTrim =
    body.length > maxBody ? `${body.slice(0, maxBody)}…` : body;
  const lines = [
    `🏘️ *${estateName} — Resident request*`,
    "",
    `*${title}*`,
    "",
    bodyTrim,
    "",
    `Open in app: ${requestUrl}`,
  ];
  return lines.join("\n");
}

/**
 * WhatsApp deep link for a facility request.
 * `phoneDigits` should be digits only (e.g. from DB); if too short, uses generic wa.me share.
 */
export function buildFacilityRequestWhatsAppUrl(
  messageText: string,
  phoneDigits: string | null | undefined
): string {
  const digits = (phoneDigits ?? "").replace(/\D/g, "");
  const base =
    digits.length >= 8 ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(messageText)}`;
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
