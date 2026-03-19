"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency, generateWhatsAppDieselMessage, type DieselBalance } from "@/lib/utils";
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

export function DieselFundView({
  currentCycle,
  pastCycles,
  unitBalances,
}: {
  currentCycle: DieselCycle | null;
  pastCycles: DieselCycle[];
  unitBalances: UnitWithBalance[];
}) {
  const router = useRouter();
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showNewCycle, setShowNewCycle] = useState(false);

  if (!currentCycle && unitBalances.length > 0) {
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

  if (!currentCycle) {
    return (
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <p className="text-zinc-600 dark:text-zinc-400">
          No units registered yet. Add units first, then start a diesel cycle.
        </p>
      </div>
    );
  }

  const amountPerUnit = Number(currentCycle.amount_per_unit);
  const totalExpected = unitBalances.reduce((s, u) => s + u.balance.totalExpected, 0);
  const totalPaid = unitBalances.reduce((s, u) => s + u.balance.totalPaid, 0);
  const totalOutstanding = totalExpected - totalPaid;
  const paidCount = unitBalances.filter(
    (u) => u.balance.balance >= 0 || u.balance.totalExpected === 0
  ).length;
  const unpaidCount = unitBalances.length - paidCount;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current cycle"
          value={`#${currentCycle.cycle_number}`}
          sub={`₦${amountPerUnit.toLocaleString()} per unit`}
        />
        <StatCard
          title="Collected"
          value={formatCurrency(totalPaid)}
          sub={`${paidCount} units paid`}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          sub={`${unpaidCount} units owing`}
        />
        <StatCard
          title="Started"
          value={format(new Date(currentCycle.started_at), "MMM d, yyyy")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowRecordPayment(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Record payment
        </button>
        <button
          onClick={() => setShowNewCycle(true)}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          Start new cycle
        </button>
        <WhatsAppReminderButton
          cycleNumber={currentCycle.cycle_number}
          amountPerUnit={amountPerUnit}
          unitBalances={unitBalances}
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
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {unitBalances.map(({ unit, balance }) => (
              <tr key={unit.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {unit.flat_number}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {unit.owner_name}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge balance={balance} amountPerUnit={amountPerUnit} />
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
            ))}
          </tbody>
        </table>
      </div>

      {pastCycles.length > 0 && (
        <CycleHistory cycles={pastCycles} />
      )}

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
  amountPerUnit,
  unitBalances,
}: {
  cycleNumber: number;
  amountPerUnit: number;
  unitBalances: UnitWithBalance[];
}) {
  const defaulters = unitBalances
    .filter((u) => u.balance.owedCycles > 0)
    .map((u) => ({
      flat: u.unit.flat_number,
      owedCycles: u.balance.owedCycles,
      owedAmount: u.balance.owedCycles * amountPerUnit,
    }));
  const paidFlats = unitBalances
    .filter((u) => u.balance.owedCycles === 0)
    .map((u) => u.unit.flat_number);
  const bankDetails =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_BANK_DETAILS
      ? process.env.NEXT_PUBLIC_BANK_DETAILS
      : "Contact treasurer";
  const url = generateWhatsAppDieselMessage(
    cycleNumber,
    defaulters,
    bankDetails,
    paidFlats
  );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
    >
      <span aria-hidden>📱</span>
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

function StatusBadge({
  balance,
  amountPerUnit,
}: {
  balance: DieselBalance;
  amountPerUnit: number;
}) {
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
              Cycle #{c.cycle_number} — ₦{Number(c.amount_per_unit).toLocaleString()}/unit
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
          toast.success("New cycle started (email not sent — check RESEND_API_KEY)");
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
