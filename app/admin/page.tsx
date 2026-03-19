import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { getCurrentResident } from "@/lib/auth";
import { isFacilityManager } from "@/lib/auth-roles";
import { getUnitDieselBalance } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const resident = await getCurrentResident();
  if (resident && isFacilityManager(resident.role)) {
    redirect("/admin/requests");
  }

  const supabase = await createClient();

  const { count: unitsCount } = await supabase
    .from("units")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { data: currentCycle } = await supabase
    .from("diesel_cycles")
    .select("*")
    .is("closed_at", null)
    .single();

  const { data: units } = await supabase
    .from("units")
    .select("id")
    .eq("is_active", true);

  let totalCollectedThisCycle = 0;
  let totalOutstanding = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  if (currentCycle && units) {
    const amountPerUnit = Number(currentCycle.amount_per_unit);
    const expectedThisCycle = units.length * amountPerUnit;
    const { data: cyclePayments } = await supabase
      .from("diesel_contributions")
      .select("amount_paid")
      .eq("cycle_id", currentCycle.id);
    totalCollectedThisCycle = (cyclePayments ?? []).reduce(
      (s, p) => s + Number(p.amount_paid),
      0
    );

    for (const unit of units) {
      const balance = await getUnitDieselBalance(supabase, unit.id);
      totalOutstanding += Math.max(0, balance.totalExpected - balance.totalPaid);
      if (balance.balance >= 0 || balance.totalExpected === 0) {
        paidCount++;
      } else {
        unpaidCount++;
      }
    }
  }

  const { data: latestNotice } = await supabase
    .from("notices")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: recentPayments } = await supabase
    .from("diesel_contributions")
    .select(
      `
      id,
      amount_paid,
      payment_date,
      payment_ref,
      units (flat_number, owner_name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(10);

  const estateName =
    process.env.NEXT_PUBLIC_ESTATE_NAME ?? "Estate Management";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Overview
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total units"
          value={unitsCount ?? 0}
          sub="Active units"
        />
        <StatCard
          title="Current cycle"
          value={currentCycle ? `#${currentCycle.cycle_number}` : "—"}
          sub={
            currentCycle
              ? `₦${Number(currentCycle.amount_per_unit).toLocaleString()} per unit`
              : "No open cycle"
          }
        />
        <StatCard
          title="Collected this cycle"
          value={`₦${totalCollectedThisCycle.toLocaleString()}`}
          sub={currentCycle ? `${paidCount} units paid` : "—"}
        />
        <StatCard
          title="Outstanding"
          value={`₦${totalOutstanding.toLocaleString()}`}
          sub={currentCycle ? `${unpaidCount} units owing` : "—"}
        />
      </div>

      {latestNotice && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold">Latest notice</h2>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
            {latestNotice.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {latestNotice.body}
          </p>
          <Link
            href="/admin/notices"
            className="mt-2 inline-block text-sm text-emerald-600 hover:text-emerald-700"
          >
            View all notices →
          </Link>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href="/admin/units"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Manage units
        </Link>
        <Link
          href="/admin/diesel"
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          Diesel fund
        </Link>
        <Link
          href="/admin/service-charge"
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          Service charge
        </Link>
        <Link
          href="/admin/reports"
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          Reports
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent payments</h2>
        {recentPayments && recentPayments.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Ref
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {recentPayments.map((p: Record<string, unknown>) => (
                  <tr key={p.id as string}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {format(
                        new Date(p.payment_date as string),
                        "MMM d, yyyy"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {(p.units as { flat_number: string })?.flat_number ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      ₦{Number(p.amount_paid).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {(p.payment_ref as string) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">
            No payments recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{sub}</p>
      )}
    </div>
  );
}
