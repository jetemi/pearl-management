"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  formatCurrency,
  generateWhatsAppDieselMessage,
  type DieselBalance,
  type DieselPoolTotals,
  type CycleAllocation,
  type WhatsAppUnitSummary,
} from "@/lib/utils";
import { sendNewCycleAnnouncement } from "@/lib/actions/email";
import { format } from "date-fns";

interface UnitWithBalance {
  unit: { id: string; flat_number: string; owner_name: string };
  balance: DieselBalance;
}

interface DieselCycle {
  id: string;
  cycle_number: number;
  amount_per_unit: number;
  started_at: string;
  closed_at: string | null;
  notes: string | null;
}

interface DieselExpenditureRow {
  id: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  cycle_id: string;
}

export function DieselFundView({
  currentCycle,
  pastCycles,
  unitBalances,
  poolTotals,
  recentExpenditures,
  activeUnitCount,
}: {
  currentCycle: DieselCycle | null;
  pastCycles: DieselCycle[];
  unitBalances: UnitWithBalance[];
  poolTotals: DieselPoolTotals;
  recentExpenditures: DieselExpenditureRow[];
  activeUnitCount: number;
}) {
  const router = useRouter();
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [showRecordPurchase, setShowRecordPurchase] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  if (activeUnitCount === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <p className="text-zinc-600 dark:text-zinc-400">
          No units registered yet. Add units first, then start a diesel cycle.
        </p>
      </div>
    );
  }

  if (unitBalances.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
        <p className="text-amber-800 dark:text-amber-200">
          Every active unit is marked <strong>off</strong> the diesel generator.
          Turn <strong>On generator</strong> for at least one unit under{" "}
          <span className="font-medium">Admin → Units</span> to manage diesel
          here.
        </p>
        {pastCycles.length > 0 && <CycleHistory cycles={pastCycles} />}
      </div>
    );
  }

  if (!currentCycle) {
    const nextCycleNum =
      pastCycles.length > 0
        ? Math.max(...pastCycles.map((c) => c.cycle_number)) + 1
        : 1;
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-amber-800 dark:text-amber-200">
            No open diesel cycle. Start a new cycle to begin recording payments.
          </p>
          <button
            onClick={() => setShowNewCycle(true)}
            className="mt-2 rounded-md border border-amber-600 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            Start new cycle
          </button>
        </div>
        {pastCycles.length > 0 && <CycleHistory cycles={pastCycles} />}
        {showNewCycle && (
          <StartNewCycleModal
            nextCycleNumber={nextCycleNum}
            currentCycleId={null}
            onClose={() => setShowNewCycle(false)}
            onStarted={() => {
              setShowNewCycle(false);
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  const amountPerUnit = Number(currentCycle.amount_per_unit);
  const cumulativeExpected = unitBalances.reduce(
    (s, u) => s + u.balance.totalExpected,
    0
  );
  const cumulativePaid = unitBalances.reduce(
    (s, u) => s + u.balance.totalPaid,
    0
  );
  const totalOutstandingCumulative = Math.max(
    0,
    cumulativeExpected - cumulativePaid
  );
  const paidUpCount = unitBalances.filter(
    (u) => u.balance.balance >= 0 || u.balance.totalExpected === 0
  ).length;
  const owingCount = unitBalances.length - paidUpCount;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current cycle"
          value={`#${currentCycle.cycle_number}`}
          sub={`₦${amountPerUnit.toLocaleString()} per unit · ${unitBalances.length} on generator`}
        />
        <StatCard
          title="Covered this cycle"
          value={formatCurrency(poolTotals.collectedThisCycle)}
          sub={`${paidUpCount} paid up · incl. prior credit`}
        />
        <StatCard
          title="Outstanding (cumulative)"
          value={formatCurrency(totalOutstandingCumulative)}
          sub={`${owingCount} units owing`}
        />
        <StatCard
          title="Started"
          value={format(new Date(currentCycle.started_at), "MMM d, yyyy")}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
          Estate diesel cash (contributions − purchases)
        </h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Per-unit owing is unchanged when you record a purchase; this is the
          pool left after buying diesel.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Purchases this cycle"
            value={formatCurrency(poolTotals.purchasesThisCycle)}
            sub="Diesel bought (this cycle)"
          />
          <StatCard
            title="Net this cycle"
            value={formatCurrency(poolTotals.netThisCycle)}
            sub="Covered minus purchases this cycle"
          />
          <StatCard
            title="Net fund (all time)"
            value={formatCurrency(poolTotals.netLifetime)}
            sub={`Lifetime in: ${formatCurrency(poolTotals.lifetimeCollected)} · out: ${formatCurrency(poolTotals.lifetimePurchases)}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowRecordPayment(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Record payment
        </button>
        <button
          onClick={() => setShowRecordPurchase(true)}
          className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500"
        >
          Record diesel purchase
        </button>
        <button
          onClick={() => setShowNewCycle(true)}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          Start new cycle
        </button>
        <WhatsAppReminderButton
          cycleNumber={currentCycle.cycle_number}
          unitBalances={unitBalances}
          participatingCount={unitBalances.length}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Flat
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Covered this cycle
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Lifetime paid
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {unitBalances.map(({ unit, balance }) => {
              const isExpanded = expandedUnit === unit.id;
              return (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  balance={balance}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedUnit(isExpanded ? null : unit.id)
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {recentExpenditures.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent diesel purchases</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {recentExpenditures.map((ex) => (
                  <tr key={ex.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                      {format(new Date(ex.expense_date), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(Number(ex.amount))}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {ex.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pastCycles.length > 0 && <CycleHistory cycles={pastCycles} />}

      {showRecordPayment && (
        <RecordPaymentModal
          cycleId={currentCycle.id}
          cycleNumber={currentCycle.cycle_number}
          amountPerUnit={amountPerUnit}
          units={unitBalances.map((u) => u.unit)}
          onClose={() => setShowRecordPayment(false)}
          onRecorded={() => {
            setShowRecordPayment(false);
            router.refresh();
          }}
        />
      )}

      {showRecordPurchase && (
        <RecordDieselPurchaseModal
          cycleId={currentCycle.id}
          cycleNumber={currentCycle.cycle_number}
          onClose={() => setShowRecordPurchase(false)}
          onRecorded={() => {
            setShowRecordPurchase(false);
            router.refresh();
          }}
        />
      )}

      {showNewCycle && (
        <StartNewCycleModal
          nextCycleNumber={
            Math.max(
              currentCycle.cycle_number,
              ...pastCycles.map((c) => c.cycle_number)
            ) + 1
          }
          currentCycleId={currentCycle.id}
          onClose={() => setShowNewCycle(false)}
          onStarted={() => {
            setShowNewCycle(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function WhatsAppReminderButton({
  cycleNumber,
  unitBalances,
  participatingCount,
}: {
  cycleNumber: number;
  unitBalances: UnitWithBalance[];
  participatingCount: number;
}) {
  const units: WhatsAppUnitSummary[] = unitBalances.map((u) => {
    const owedCycles = u.balance.perCycleBreakdown
      .filter((c) => c.shortfall > 0)
      .map((c) => ({ cycleNumber: c.cycleNumber, amount: c.shortfall }));
    return {
      flat: u.unit.flat_number,
      owedCycles,
      paidThisCycle: u.balance.paidCurrentCycle >= u.balance.amountPerUnit,
      excessAmount: Math.max(0, u.balance.balance),
    };
  });
  const bankDetails =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_BANK_DETAILS
      ? process.env.NEXT_PUBLIC_BANK_DETAILS
      : "Contact treasurer";
  const url = generateWhatsAppDieselMessage(
    cycleNumber,
    units,
    bankDetails,
    participatingCount
  );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
    >
      <span aria-hidden>{String.fromCodePoint(0x1f4f1)}</span>
      Generate WhatsApp reminder
    </a>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
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

function StatusBadge({ balance }: { balance: DieselBalance }) {
  if (balance.dieselNotApplicable) {
    return (
      <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        N/A
      </span>
    );
  }
  if (balance.owedCycles > 0) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
        Owes {balance.owedCycles} cycle(s)
      </span>
    );
  }
  if (balance.aheadCycles > 0) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
        Ahead {balance.aheadCycles} cycle(s)
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
      Paid up
    </span>
  );
}

function UnitRow({
  unit,
  balance,
  isExpanded,
  onToggle,
}: {
  unit: { id: string; flat_number: string; owner_name: string };
  balance: DieselBalance;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasBreakdown = balance.perCycleBreakdown.length > 0;
  return (
    <>
      <tr
        className={hasBreakdown ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50" : ""}
        onClick={hasBreakdown ? onToggle : undefined}
      >
        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <span className="flex items-center gap-1.5">
            {hasBreakdown && (
              <svg
                className={`h-3.5 w-3.5 flex-shrink-0 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {unit.flat_number}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
          {unit.owner_name}
        </td>
        <td className="px-4 py-3">
          <StatusBadge balance={balance} />
        </td>
        <td className="px-4 py-3 text-right text-sm text-zinc-700 dark:text-zinc-300">
          {formatCurrency(balance.paidCurrentCycle)}
        </td>
        <td className="px-4 py-3 text-right text-sm text-zinc-700 dark:text-zinc-300">
          {formatCurrency(balance.totalPaid)}
        </td>
        <td className="px-4 py-3 text-right text-sm">
          {balance.balance < 0 ? (
            <span className="text-amber-600 dark:text-amber-400">
              -{formatCurrency(Math.abs(balance.balance))}
            </span>
          ) : balance.balance > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(balance.balance)}
            </span>
          ) : (
            <span className="text-zinc-500">—</span>
          )}
        </td>
      </tr>
      {isExpanded && hasBreakdown && (
        <tr>
          <td colSpan={6} className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900/30">
            <CycleBreakdown breakdown={balance.perCycleBreakdown} />
          </td>
        </tr>
      )}
    </>
  );
}

function CycleBreakdown({ breakdown }: { breakdown: CycleAllocation[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="text-zinc-500 dark:text-zinc-400">
            <th className="pb-1 pr-4 text-left font-medium">Cycle</th>
            <th className="pb-1 pr-4 text-right font-medium">Expected</th>
            <th className="pb-1 pr-4 text-right font-medium">Covered</th>
            <th className="pb-1 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((entry) => {
            let status: string;
            let statusClass: string;
            if (entry.shortfall === 0) {
              status = "Paid";
              statusClass = "text-emerald-600 dark:text-emerald-400";
            } else if (entry.allocated > 0) {
              status = `Partial (owes ${formatCurrency(entry.shortfall)})`;
              statusClass = "text-amber-600 dark:text-amber-400";
            } else {
              status = "Unpaid";
              statusClass = "text-red-600 dark:text-red-400";
            }
            return (
              <tr key={entry.cycleId}>
                <td className="py-1 pr-4 text-zinc-700 dark:text-zinc-300">
                  #{entry.cycleNumber}
                  {entry.isOpen && (
                    <span className="ml-1 text-[10px] font-medium uppercase text-blue-600 dark:text-blue-400">
                      current
                    </span>
                  )}
                </td>
                <td className="py-1 pr-4 text-right text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(entry.expected)}
                </td>
                <td className="py-1 pr-4 text-right text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(entry.allocated)}
                </td>
                <td className={`py-1 font-medium ${statusClass}`}>
                  {status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CycleHistory({ cycles }: { cycles: DieselCycle[] }) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Cycle history</h2>
      <div className="space-y-2">
        {cycles.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded border border-zinc-200 px-4 py-2 dark:border-zinc-800"
          >
            <span>
              Cycle #{c.cycle_number} — ₦
              {Number(c.amount_per_unit).toLocaleString()}/unit
            </span>
            <span className="text-sm text-zinc-500">
              {format(new Date(c.started_at), "MMM yyyy")} –{" "}
              {c.closed_at
                ? format(new Date(c.closed_at), "MMM yyyy")
                : "Open"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordPaymentModal({
  cycleId,
  cycleNumber,
  amountPerUnit,
  units,
  onClose,
  onRecorded,
}: {
  cycleId: string;
  cycleNumber: number;
  amountPerUnit: number;
  units: { id: string; flat_number: string; owner_name: string }[];
  onClose: () => void;
  onRecorded: () => void;
}) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [amount, setAmount] = useState(amountPerUnit.toString());
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("diesel_contributions").insert({
        cycle_id: cycleId,
        unit_id: unitId,
        amount_paid: parseFloat(amount),
        payment_date: paymentDate,
        payment_ref: paymentRef.trim() || null,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Payment recorded");
      onRecorded();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">
          Record payment — Cycle #{cycleNumber}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Unit</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.flat_number} — {u.owner_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Amount (₦)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border px-3 py-2"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Payment date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Payment reference
            </label>
            <input
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Bank transfer ref"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Recording..." : "Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordDieselPurchaseModal({
  cycleId,
  cycleNumber,
  onClose,
  onRecorded,
}: {
  cycleId: string;
  cycleNumber: number;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("diesel_expenditures").insert({
        cycle_id: cycleId,
        amount: n,
        expense_date: expenseDate,
        notes: notes.trim() || null,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Purchase recorded");
      onRecorded();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">
          Record diesel purchase — Cycle #{cycleNumber}
        </h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Reduces the estate cash pool for this cycle and overall. Does not
          change per-unit amounts owed.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Cost (₦)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border px-3 py-2"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Purchase date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Supplier, litres, invoice ref…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-900 disabled:opacity-50 dark:bg-zinc-600"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StartNewCycleModal({
  nextCycleNumber,
  currentCycleId,
  onClose,
  onStarted,
}: {
  nextCycleNumber: number;
  currentCycleId?: string | null;
  onClose: () => void;
  onStarted: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [emailResidents, setEmailResidents] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (currentCycleId) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase
          .from("diesel_cycles")
          .update({ closed_at: today })
          .eq("id", currentCycleId);
      }
      const { error } = await supabase.from("diesel_cycles").insert({
        cycle_number: nextCycleNumber,
        amount_per_unit: parseFloat(amount),
        started_at: startDate,
        closed_at: null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      if (emailResidents) {
        const result = await sendNewCycleAnnouncement(
          nextCycleNumber,
          parseFloat(amount),
          startDate
        );
        if (result.success) {
          toast.success("New cycle started and residents emailed");
        } else {
          toast.success(
            "New cycle started (email not sent — check RESEND_API_KEY)"
          );
        }
      } else {
        toast.success("New cycle started");
      }
      onStarted();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start cycle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Start new cycle</h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Balances are cumulative: units that still owe from earlier cycles
          continue to owe until they pay. Units ahead keep their credit.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Cycle #{nextCycleNumber}
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Amount per unit (₦)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. 5000"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border px-3 py-2"
              required
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={emailResidents}
              onChange={(e) => setEmailResidents(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Email residents about new cycle</span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start cycle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
