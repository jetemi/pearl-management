"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { formatCurrency, type ServiceChargePeriodStatus } from "@/lib/utils";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/utils";
import { sendServiceChargeOverdueReminder } from "@/lib/actions/email";

interface UnitStatus {
  unit: { id: string; flat_number: string; owner_name: string };
  status: ServiceChargePeriodStatus[];
}

interface Period {
  id: string;
  period_label: string;
  amount_per_unit: number;
  due_date: string | null;
  created_at: string;
}

export function ServiceChargeView({
  periods,
  units,
  unitStatuses,
  unitsWithEmail,
}: {
  periods: Period[];
  units: { id: string; flat_number: string; owner_name: string }[];
  unitStatuses: UnitStatus[];
  unitsWithEmail: { id: string; flat_number: string; owner_name: string; email: string | null }[];
}) {
  const router = useRouter();
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    periods[0]?.id ?? null
  );

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  const getUnitStatusForPeriod = (unitId: string) => {
    const us = unitStatuses.find((u) => u.unit.id === unitId);
    return us?.status.find((s) => s.periodId === selectedPeriodId) ?? null;
  };

  const defaultersForPeriod = unitStatuses.filter((us) => {
    const s = us.status.find((sp) => sp.periodId === selectedPeriodId);
    return s && !s.paid;
  });

  const defaultersWithEmail = defaultersForPeriod
    .map(({ unit }) => {
      const u = unitsWithEmail.find((x) => x.id === unit.id);
      return u ? { ...unit, email: u.email } : null;
    })
    .filter((u): u is { id: string; flat_number: string; owner_name: string; email: string | null } => !!u);

  const handleExportDefaulters = () => {
    if (!selectedPeriod) return;
    const rows = defaultersForPeriod.map(({ unit }) => ({
      flat_number: unit.flat_number,
      owner_name: unit.owner_name,
      amount: selectedPeriod.amount_per_unit,
      status: "Outstanding",
    }));
    const csv = exportToCSV(rows, [
      { key: "flat_number", header: "Flat" },
      { key: "owner_name", header: "Owner" },
      { key: "amount", header: "Amount (₦)" },
      { key: "status", header: "Status" },
    ]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-charge-defaulters-${selectedPeriod.period_label.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowNewPeriod(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create new period
        </button>
        <button
          onClick={() => setShowRecordPayment(true)}
          disabled={!selectedPeriod}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-900/20"
        >
          Record payment
        </button>
        {selectedPeriod && defaultersForPeriod.length > 0 && (
          <>
            <button
              onClick={handleExportDefaulters}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Export defaulters CSV
            </button>
            <EmailDefaultersButton
              periodLabel={selectedPeriod.period_label}
              amountPerUnit={Number(selectedPeriod.amount_per_unit)}
              defaulters={defaultersWithEmail}
            />
          </>
        )}
      </div>

      {periods.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-amber-800 dark:text-amber-200">
            No service charge periods yet. Create a period (e.g. &quot;2025
            Annual Levy&quot;) to begin recording payments.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriodId(p.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  selectedPeriodId === p.id
                    ? "bg-emerald-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {p.period_label}
              </button>
            ))}
          </div>

          {selectedPeriod && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="font-medium">
                  {selectedPeriod.period_label}
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  ₦{Number(selectedPeriod.amount_per_unit).toLocaleString()} per
                  unit
                </span>
                {selectedPeriod.due_date && (
                  <span className="text-sm text-zinc-500">
                    Due:{" "}
                    {format(
                      new Date(selectedPeriod.due_date),
                      "MMM d, yyyy"
                    )}
                  </span>
                )}
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
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                    {unitStatuses.map(({ unit }) => {
                      const s = getUnitStatusForPeriod(unit.id);
                      return (
                        <tr key={unit.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {unit.flat_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                            {unit.owner_name}
                          </td>
                          <td className="px-4 py-3">
                            {s?.paid ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                                Outstanding
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {s?.paid
                              ? formatCurrency(s.amountPaid)
                              : formatCurrency(
                                  selectedPeriod.amount_per_unit
                                )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showNewPeriod && (
        <CreatePeriodModal
          onClose={() => setShowNewPeriod(false)}
          onCreated={() => {
            setShowNewPeriod(false);
            router.refresh();
          }}
        />
      )}

      {showRecordPayment && selectedPeriod && (
        <RecordPaymentModal
          periodId={selectedPeriod.id}
          periodLabel={selectedPeriod.period_label}
          amountPerUnit={Number(selectedPeriod.amount_per_unit)}
          units={units}
          onClose={() => setShowRecordPayment(false)}
          onRecorded={() => {
            setShowRecordPayment(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EmailDefaultersButton({
  periodLabel,
  amountPerUnit,
  defaulters,
}: {
  periodLabel: string;
  amountPerUnit: number;
  defaulters: { flat_number: string; owner_name: string; email: string | null }[];
}) {
  const [loading, setLoading] = useState(false);
  const withEmail = defaulters.filter((d) => d.email?.includes("@"));

  async function handleClick() {
    if (withEmail.length === 0) {
      toast.error("No defaulters have email addresses");
      return;
    }
    setLoading(true);
    try {
      const result = await sendServiceChargeOverdueReminder(
        periodLabel,
        amountPerUnit,
        withEmail.map((d) => ({
          flat_number: d.flat_number,
          owner_name: d.owner_name,
          email: d.email!,
        }))
      );
      if (result.success) {
        toast.success(`Reminder sent to ${withEmail.length} resident(s)`);
      } else {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Failed to send emails"
        );
      }
    } catch {
      toast.error("Failed to send emails");
    } finally {
      setLoading(false);
    }
  }

  if (withEmail.length === 0) return null;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50"
    >
      {loading ? "Sending…" : `Email ${withEmail.length} defaulter(s)`}
    </button>
  );
}

function CreatePeriodModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("service_charge_periods").insert({
        period_label: label.trim(),
        amount_per_unit: parseFloat(amount),
        due_date: dueDate || null,
      });
      if (error) throw error;
      toast.success("Period created");
      onCreated();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Create service charge period</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Period label
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              placeholder="e.g. 2025 Annual Levy"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Amount per unit (₦)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
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
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  periodId,
  periodLabel,
  amountPerUnit,
  units,
  onClose,
  onRecorded,
}: {
  periodId: string;
  periodLabel: string;
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
      const { error } = await supabase.from("service_charge_payments").insert({
        period_id: periodId,
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
          Record payment — {periodLabel}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Unit</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
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
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Payment date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
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
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
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
