import type { SupabaseClient } from "@supabase/supabase-js";

/** Normalize Supabase joined `units` (object or single-element array). */
export function flatNumberFromUnitsJoin(
  units: { flat_number: string } | { flat_number: string }[] | null | undefined
): string {
  if (!units) return "—";
  if (Array.isArray(units)) return units[0]?.flat_number ?? "—";
  return units.flat_number ?? "—";
}

export interface CycleAllocation {
  cycleId: string;
  cycleNumber: number;
  expected: number;
  allocated: number;
  shortfall: number;
  isOpen: boolean;
}

/**
 * Waterfall: pour a unit's total paid into cycles oldest-first,
 * allocating up to `amount_per_unit` per cycle.
 */
export function allocatePaymentsToCycles(
  cycles: { id: string; cycle_number: number; amount_per_unit: number; closed_at: string | null }[],
  totalPaid: number
): CycleAllocation[] {
  let remaining = totalPaid;
  return cycles.map((c) => {
    const expected = Number(c.amount_per_unit);
    const allocated = Math.min(expected, Math.max(0, remaining));
    remaining -= allocated;
    return {
      cycleId: c.id,
      cycleNumber: c.cycle_number,
      expected,
      allocated,
      shortfall: expected - allocated,
      isOpen: c.closed_at == null,
    };
  });
}

export interface DieselBalance {
  totalExpected: number;
  totalPaid: number;
  balance: number;
  owedCycles: number;
  aheadCycles: number;
  amountPerUnit: number;
  /** Effective amount covered toward the open cycle (waterfall-allocated, includes prior credit). */
  paidCurrentCycle: number;
  /** True when unit is not on the generator — diesel section should show N/A. */
  dieselNotApplicable?: boolean;
  /** Per-cycle breakdown showing how payments are allocated oldest-first. */
  perCycleBreakdown: CycleAllocation[];
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
    purchasesThisCycle = await sumExpendituresForCycle(supabase, openCycleId);

    const { data: allCycles } = await supabase
      .from("diesel_cycles")
      .select("id, cycle_number, amount_per_unit, closed_at")
      .order("cycle_number", { ascending: true });

    if (allCycles && participatingUnitIds.length > 0) {
      const { data: allContribs } = await supabase
        .from("diesel_contributions")
        .select("unit_id, amount_paid")
        .in("unit_id", participatingUnitIds);

      const contribsByUnit = new Map<string, number>();
      for (const row of allContribs ?? []) {
        contribsByUnit.set(
          row.unit_id,
          (contribsByUnit.get(row.unit_id) ?? 0) + Number(row.amount_paid)
        );
      }

      for (const unitId of participatingUnitIds) {
        const unitTotal = contribsByUnit.get(unitId) ?? 0;
        const breakdown = allocatePaymentsToCycles(allCycles, unitTotal);
        const openEntry = breakdown.find((e) => e.isOpen);
        collectedThisCycle += openEntry?.allocated ?? 0;
      }
    }
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
      perCycleBreakdown: [],
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

  const perCycleBreakdown = allocatePaymentsToCycles(allCycles, totalPaid);
  const openEntry = perCycleBreakdown.find((e) => e.isOpen);
  const paidCurrentCycle = openEntry?.allocated ?? 0;

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
    perCycleBreakdown,
  };
}

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

export interface ServiceChargePeriodAllocation {
  periodId: string;
  expected: number;
  allocated: number;
  shortfall: number;
}

export function allocatePaymentsToServiceChargePeriods(
  periods: { id: string; amount_per_unit: number }[],
  totalPaid: number
): ServiceChargePeriodAllocation[] {
  let remaining = totalPaid;
  return periods.map((p) => {
    const expected = Number(p.amount_per_unit);
    const allocated = Math.min(expected, Math.max(0, remaining));
    remaining -= allocated;
    return {
      periodId: p.id,
      expected,
      allocated,
      shortfall: expected - allocated,
    };
  });
}

export interface ServiceChargePeriodStatus {
  periodId: string;
  periodLabel: string;
  amountPerUnit: number;
  dueDate: string | null;
  /** True when waterfall-allocated amount fully covers this period. */
  paid: boolean;
  /**
   * Amount effectively covered toward this period (oldest-first allocation).
   * Same meaning as diesel: surplus from earlier periods can count here.
   */
  amountPaid: number;
  /** Sum of payment rows recorded against this period (audit; may differ from amountPaid). */
  amountRecorded: number;
  /** Remaining obligation for this period after allocation. */
  amountOwed: number;
  paymentDate: string | null;
}

export async function getUnitServiceChargeStatus(
  supabase: SupabaseClient,
  unitId: string
): Promise<ServiceChargePeriodStatus[]> {
  const { data: periods } = await supabase
    .from("service_charge_periods")
    .select("id, period_label, amount_per_unit, due_date, created_at")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const periodsList = periods ?? [];

  const { data: payments } = await supabase
    .from("service_charge_payments")
    .select("period_id, amount_paid, payment_date")
    .eq("unit_id", unitId);

  const paymentRows = payments ?? [];
  const totalPaid = paymentRows.reduce(
    (s, p) => s + Number(p.amount_paid),
    0
  );

  const recordedByPeriod = new Map<
    string,
    { sum: number; lastDate: string | null }
  >();
  for (const p of paymentRows) {
    const pid = p.period_id;
    const cur = recordedByPeriod.get(pid) ?? { sum: 0, lastDate: null };
    const sum = cur.sum + Number(p.amount_paid);
    const pd = p.payment_date;
    let lastDate = cur.lastDate;
    if (pd && (!lastDate || pd > lastDate)) lastDate = pd;
    recordedByPeriod.set(pid, { sum, lastDate });
  }

  const orderedForAlloc = periodsList.map((p) => ({
    id: p.id,
    amount_per_unit: Number(p.amount_per_unit),
  }));

  const breakdown = allocatePaymentsToServiceChargePeriods(
    orderedForAlloc,
    totalPaid
  );
  const allocById = new Map(
    breakdown.map((b) => [b.periodId, b] as const)
  );

  return periodsList.map((period) => {
    const expected = Number(period.amount_per_unit);
    const alloc = allocById.get(period.id);
    const allocated = alloc?.allocated ?? 0;
    const rec = recordedByPeriod.get(period.id);
    const amountRecorded = rec?.sum ?? 0;
    const EPS = 1e-6;
    const paid = allocated + EPS >= expected;
    const amountOwed = Math.max(0, expected - allocated);

    return {
      periodId: period.id,
      periodLabel: period.period_label,
      amountPerUnit: expected,
      dueDate: period.due_date,
      paid,
      amountPaid: allocated,
      amountRecorded,
      amountOwed,
      paymentDate: rec?.lastDate ?? null,
    };
  });
}

export interface WhatsAppUnitSummary {
  flat: string;
  owedCycles: { cycleNumber: number; amount: number }[];
  paidThisCycle: boolean;
  excessAmount: number;
}

/**
 * WhatsApp message emojis built at runtime via code points.
 * Some builds corrupt `\u{...}` escapes in the bundle (they become U+FFFD in URLs).
 */
const WA = {
  estate: String.fromCodePoint(0x1f3d8, 0xfe0f),
  warn: String.fromCodePoint(0x26a0, 0xfe0f),
  check: String.fromCodePoint(0x2705),
  pray: String.fromCodePoint(0x1f64f),
} as const;

/** Official share URL; same `text` param as wa.me (avoids redirect quirks in some clients). */
function buildWhatsAppShareUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppDieselMessage(
  cycleNumber: number,
  units: WhatsAppUnitSummary[],
  bankDetails: string,
  flatsOnGenerator?: number
) {
  const estateName =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ESTATE_NAME
      ? process.env.NEXT_PUBLIC_ESTATE_NAME
      : "Estate";

  const owing = units.filter((u) => u.owedCycles.length > 0);
  const paid = units.filter((u) => u.owedCycles.length === 0);

  const outstandingLines: string[] = [];
  if (owing.length > 0) {
    outstandingLines.push(`${WA.warn} *Outstanding (${owing.length}):*`);
    for (const u of owing) {
      const total = u.owedCycles.reduce((s, c) => s + c.amount, 0);
      const detail = u.owedCycles
        .map((c) => `Cycle ${c.cycleNumber}: ₦${c.amount.toLocaleString()}`)
        .join(", ");
      outstandingLines.push(
        `- ${u.flat}: ₦${total.toLocaleString()} (${detail})`
      );
    }
  } else {
    outstandingLines.push(
      `${WA.check} *Outstanding:* none — all units are up to date.`
    );
  }

  const paidLines: string[] = [];
  if (paid.length > 0) {
    paidLines.push(`${WA.check} *Paid (${paid.length}):*`);
    const aheadUnits = paid.filter((u) => u.excessAmount > 0);
    const exactUnits = paid.filter((u) => u.excessAmount === 0);
    if (exactUnits.length > 0) {
      paidLines.push(exactUnits.map((u) => u.flat).join(", "));
    }
    if (aheadUnits.length > 0) {
      for (const u of aheadUnits) {
        paidLines.push(
          `${u.flat} _(+₦${u.excessAmount.toLocaleString()} credit)_`
        );
      }
    }
  } else {
    paidLines.push(`${WA.check} *Paid:* (none yet)`);
  }

  const lines: (string | null)[] = [
    `${WA.estate} *${estateName} — Diesel Fund Cycle ${cycleNumber}*`,
    flatsOnGenerator != null
      ? `_Flats on generator: ${flatsOnGenerator}_`
      : null,
    "",
    ...outstandingLines,
    "",
    `*Please pay to:*`,
    bankDetails,
    "",
    ...paidLines,
    "",
    `Thank you ${WA.pray}`,
  ];
  const message = lines.filter((l): l is string => l !== null).join("\n");
  return buildWhatsAppShareUrl(message);
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
    body.length > maxBody ? `${body.slice(0, maxBody)}...` : body;
  const lines = [
    `${WA.estate} *${estateName} — Resident request*`,
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
  const q = encodeURIComponent(messageText);
  if (digits.length >= 8) {
    return `https://wa.me/${digits}?text=${q}`;
  }
  return buildWhatsAppShareUrl(messageText);
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
