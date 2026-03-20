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
  /** Sum of contributions for the open cycle only (0 if no open cycle). */
  paidCurrentCycle: number;
  /** True when unit is not on the generator — diesel section should show N/A. */
  dieselNotApplicable?: boolean;
}

export async function sumContributionsForCycle(
  supabase: SupabaseClient,
  cycleId: string,
  unitIds?: string[]
): Promise<number> {
  let q = supabase
    .from("diesel_contributions")
    .select("amount_paid")
    .eq("cycle_id", cycleId);
  if (unitIds && unitIds.length > 0) {
    q = q.in("unit_id", unitIds);
  }
  const { data } = await q;
  return (data ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);
}

export async function sumContributionsForUnits(
  supabase: SupabaseClient,
  unitIds: string[]
): Promise<number> {
  if (unitIds.length === 0) return 0;
  const { data } = await supabase
    .from("diesel_contributions")
    .select("amount_paid")
    .in("unit_id", unitIds);
  return (data ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);
}

export async function sumExpendituresForCycle(
  supabase: SupabaseClient,
  cycleId: string
): Promise<number> {
  const { data } = await supabase
    .from("diesel_expenditures")
    .select("amount")
    .eq("cycle_id", cycleId);
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}

export async function sumExpendituresAll(
  supabase: SupabaseClient
): Promise<number> {
  const { data } = await supabase.from("diesel_expenditures").select("amount");
  return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
}

export interface DieselPoolTotals {
  collectedThisCycle: number;
  purchasesThisCycle: number;
  netThisCycle: number;
  lifetimeCollected: number;
  lifetimePurchases: number;
  netLifetime: number;
}

export async function getDieselPoolTotals(
  supabase: SupabaseClient,
  openCycleId: string | null,
  participatingUnitIds: string[]
): Promise<DieselPoolTotals> {
  const lifetimeCollected = await sumContributionsForUnits(
    supabase,
    participatingUnitIds
  );
  const lifetimePurchases = await sumExpendituresAll(supabase);
  const netLifetime = lifetimeCollected - lifetimePurchases;

  let collectedThisCycle = 0;
  let purchasesThisCycle = 0;
  if (openCycleId) {
    collectedThisCycle = await sumContributionsForCycle(
      supabase,
      openCycleId,
      participatingUnitIds
    );
    purchasesThisCycle = await sumExpendituresForCycle(
      supabase,
      openCycleId
    );
  }

  return {
    collectedThisCycle,
    purchasesThisCycle,
    netThisCycle: collectedThisCycle - purchasesThisCycle,
    lifetimeCollected,
    lifetimePurchases,
    netLifetime,
  };
}

/**
 * @param dieselParticipates - when false, returns zeroed obligation (no diesel / not on generator).
 */
export async function getUnitDieselBalance(
  supabase: SupabaseClient,
  unitId: string,
  dieselParticipates: boolean = true
): Promise<DieselBalance> {
  if (!dieselParticipates) {
    return {
      totalExpected: 0,
      totalPaid: 0,
      balance: 0,
      owedCycles: 0,
      aheadCycles: 0,
      amountPerUnit: 0,
      paidCurrentCycle: 0,
      dieselNotApplicable: true,
    };
  }

  const { data: cycles } = await supabase
    .from("diesel_cycles")
    .select("id, cycle_number, amount_per_unit, closed_at")
    .order("cycle_number", { ascending: true });

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

  const openCycle = allCycles.find((c) => c.closed_at == null);
  const amountPerUnit = openCycle
    ? Number(openCycle.amount_per_unit)
    : allCycles.length > 0
      ? Number(allCycles[allCycles.length - 1].amount_per_unit)
      : 0;

  let paidCurrentCycle = 0;
  if (openCycle && contributions) {
    paidCurrentCycle = contributions
      .filter((c) => c.cycle_id === openCycle.id)
      .reduce((s, c) => s + Number(c.amount_paid), 0);
  }

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
    paidCurrentCycle,
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
  paidFlats: string[],
  flatsOnGenerator?: number
) {
  const estateName =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ESTATE_NAME
      ? process.env.NEXT_PUBLIC_ESTATE_NAME
      : "Estate";
  const lines = [
    `🏘️ *${estateName} — Diesel Fund Cycle ${cycleNumber}*`,
    flatsOnGenerator != null
      ? `_Flats on generator: ${flatsOnGenerator}_`
      : null,
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
