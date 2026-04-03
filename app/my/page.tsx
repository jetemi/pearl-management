import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getCurrentResident } from "@/lib/auth";
import { isFacilityManager } from "@/lib/auth-roles";
import {
  getUnitDieselBalance,
  getUnitServiceChargeStatus,
  formatCurrency,
} from "@/lib/utils";
import { format } from "date-fns";

export default async function MyDashboardPage() {
  const resident = await getCurrentResident();

  if (!resident) {
    redirect("/login");
  }

  if (!resident.unit_id) {
    if (isFacilityManager(resident.role)) {
      return (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            My Dashboard
          </h1>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-700 dark:text-zinc-300">
              Facility manager account (no unit assigned).
            </p>
            <Link
              href="/admin/requests"
              className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Open resident requests
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
        <p className="text-amber-800 dark:text-amber-200">
          Your account is not yet linked to a unit. Please contact the estate
          committee to assign your unit.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("units")
    .select("flat_number, owner_name, diesel_participates")
    .eq("id", resident.unit_id)
    .single();

  const dieselParticipates = unit?.diesel_participates ?? true;
  const balance = await getUnitDieselBalance(
    supabase,
    resident.unit_id,
    dieselParticipates
  );
  const serviceChargeStatus = await getUnitServiceChargeStatus(
    supabase,
    resident.unit_id
  );

  const { data: recentPayments } = await supabase
    .from("diesel_contributions")
    .select("amount_paid, payment_date, payment_ref")
    .eq("unit_id", resident.unit_id)
    .order("payment_date", { ascending: false })
    .limit(5);

  const { data: notices } = await supabase
    .from("notices")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  const flatNumber = unit?.flat_number ?? "—";
  const ownerName = unit?.owner_name ?? "—";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        My Dashboard
      </h1>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
        <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Facility requests
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Submit maintenance or service requests to the facility manager.
        </p>
        <Link
          href="/my/requests"
          className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          My requests
        </Link>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Unit details</h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Flat:</span> {flatNumber}
        </p>
        <p className="text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Owner:</span> {ownerName}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Diesel fund status</h2>
        <DieselStatus balance={balance} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Service charge status</h2>
        <ServiceChargeStatus status={serviceChargeStatus} />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium">Recent payments</h2>
        {recentPayments && recentPayments.length > 0 ? (
          <ul className="space-y-2">
            {recentPayments.map((p, i) => (
              <li
                key={i}
                className="flex justify-between border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {format(new Date(p.payment_date), "MMM d, yyyy")}
                  {p.payment_ref && (
                    <span className="ml-2 text-zinc-500">
                      ({p.payment_ref})
                    </span>
                  )}
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Number(p.amount_paid))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">
            No payments recorded yet.
          </p>
        )}
      </div>

      {notices && notices.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-medium">Latest notices</h2>
          <ul className="space-y-4">
            {notices.map((n) => (
              <li
                key={n.id}
                className="border-b border-zinc-100 pb-4 last:border-0 dark:border-zinc-800"
              >
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {n.title}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                  {n.body}
                </p>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  {format(new Date(n.created_at), "MMM d, yyyy")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ServiceChargeStatus({
  status,
}: {
  status: {
    periodId: string;
    periodLabel: string;
    paid: boolean;
    amountPerUnit: number;
    amountOwed: number;
    amountPaid: number;
    dueDate: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    obligationApplies: boolean;
  }[];
}) {
  const relevant = status.filter((s) => s.obligationApplies);
  const outstanding = relevant.filter((s) => !s.paid);
  const paid = relevant.filter((s) => s.paid);

  if (relevant.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">
        No service charge levies are set up for your unit yet.
      </p>
    );
  }

  if (outstanding.length > 0) {
    const totalOwed = outstanding.reduce((s, x) => s + x.amountOwed, 0);
    return (
      <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Outstanding: {outstanding.map((s) => s.periodLabel).join(", ")}
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          Total still owed: {formatCurrency(totalOwed)}
        </p>
        <ul className="mt-2 list-inside list-disc text-xs text-amber-800/90 dark:text-amber-200/90">
          {outstanding.map((s) => (
            <li key={s.periodId}>
              {s.periodLabel}
              {s.periodStart && s.periodEnd
                ? ` (${format(new Date(s.periodStart), "MMM d, yyyy")} – ${format(new Date(s.periodEnd), "MMM d, yyyy")})`
                : null}
              : {formatCurrency(s.amountOwed)}
              {s.amountPaid > 0 && s.amountOwed > 0
                ? ` (${formatCurrency(s.amountPaid)} covered, ${formatCurrency(s.amountOwed)} remaining)`
                : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-emerald-50 p-4 dark:bg-emerald-900/20">
      <p className="font-medium text-emerald-800 dark:text-emerald-200">
        All paid up
      </p>
      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
        {paid.length} levy(ies) settled
      </p>
    </div>
  );
}

function DieselStatus({
  balance,
}: {
  balance: {
    balance: number;
    owedCycles: number;
    aheadCycles: number;
    amountPerUnit: number;
    paidCurrentCycle: number;
    totalPaid: number;
    dieselNotApplicable?: boolean;
  };
}) {
  if (balance.dieselNotApplicable) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          This unit is <strong>not</strong> on the diesel generator, so there
          is no diesel contribution obligation here.
        </p>
      </div>
    );
  }

  if (balance.owedCycles > 0) {
    return (
      <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Owing {balance.owedCycles} cycle(s)
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          Amount: {formatCurrency(Math.abs(balance.balance))}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Please pay to: {process.env.NEXT_PUBLIC_BANK_DETAILS ?? "Contact treasurer"}
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          This cycle: {formatCurrency(balance.paidCurrentCycle)} · All cycles:{" "}
          {formatCurrency(balance.totalPaid)}
        </p>
      </div>
    );
  }

  if (balance.aheadCycles > 0) {
    return (
      <div className="rounded-md bg-emerald-50 p-4 dark:bg-emerald-900/20">
        <p className="font-medium text-emerald-800 dark:text-emerald-200">
          Ahead {balance.aheadCycles} cycle(s)
        </p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
          Credit: {formatCurrency(balance.balance)}
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          This cycle: {formatCurrency(balance.paidCurrentCycle)} · All cycles:{" "}
          {formatCurrency(balance.totalPaid)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-emerald-50 p-4 dark:bg-emerald-900/20">
      <p className="font-medium text-emerald-800 dark:text-emerald-200">
        Paid up
      </p>
      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
        Your diesel contributions are up to date.
      </p>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        This cycle: {formatCurrency(balance.paidCurrentCycle)} · All cycles:{" "}
        {formatCurrency(balance.totalPaid)}
      </p>
    </div>
  );
}
