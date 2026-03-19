import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
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
    .select("flat_number, owner_name")
    .eq("id", resident.unit_id)
    .single();

  const balance = await getUnitDieselBalance(supabase, resident.unit_id);
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
    periodLabel: string;
    paid: boolean;
    amountPerUnit: number;
    dueDate: string | null;
  }[];
}) {
  const outstanding = status.filter((s) => !s.paid);
  const paid = status.filter((s) => s.paid);

  if (status.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">
        No service charge periods defined yet.
      </p>
    );
  }

  if (outstanding.length > 0) {
    return (
      <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-900/20">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Outstanding: {outstanding.map((s) => s.periodLabel).join(", ")}
        </p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
          Total: {formatCurrency(outstanding.reduce((s, x) => s + x.amountPerUnit, 0))}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-emerald-50 p-4 dark:bg-emerald-900/20">
      <p className="font-medium text-emerald-800 dark:text-emerald-200">
        All paid up
      </p>
      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
        {paid.length} period(s) paid
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
  };
}) {
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
    </div>
  );
}
