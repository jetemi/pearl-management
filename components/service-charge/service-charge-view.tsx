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

export type ObligationOption = {
  id: string;
  unit_id: string;
  label: string;
  amount: number;
  period_start: string;
  period_end: string;
  period_template_id: string | null;
  flat_number: string;
  owner_name: string;
};

interface LevyTemplate {
  id: string;
  period_label: string;
  amount_per_unit: number;
  due_date: string | null;
  created_at: string;
}

function formatWindow(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  return `${format(new Date(start), "MMM d, yyyy")} – ${format(new Date(end), "MMM d, yyyy")}`;
}

export function ServiceChargeView({
  templates,
  obligationOptions,
  units,
  unitStatuses,
  unitsWithEmail,
}: {
  templates: LevyTemplate[];
  obligationOptions: ObligationOption[];
  units: { id: string; flat_number: string; owner_name: string }[];
  unitStatuses: UnitStatus[];
  unitsWithEmail: { id: string; flat_number: string; owner_name: string; email: string | null }[];
}) {
  const router = useRouter();
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showNewObligation, setShowNewObligation] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  /** null = all levies; otherwise filter by template id */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates[0]?.id ?? null
  );

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const tableRows = unitStatuses.flatMap(({ unit, status }) =>
    status
      .filter((s) => {
        if (!s.obligationApplies) return false;
        if (selectedTemplateId === null) return true;
        return s.templateId === selectedTemplateId;
      })
      .map((s) => ({ unit, s }))
  );

  const defaultersRows = tableRows.filter(({ s }) => !s.paid);

  const defaultersWithEmail = defaultersRows
    .map(({ unit, s }) => {
      const u = unitsWithEmail.find((x) => x.id === unit.id);
      return u
        ? {
            flat_number: unit.flat_number,
            owner_name: unit.owner_name,
            email: u.email,
            amountOwed: s.amountOwed,
          }
        : null;
    })
    .filter(
      (
        row
      ): row is {
        flat_number: string;
        owner_name: string;
        email: string | null;
        amountOwed: number;
      } => !!row
    );

  const exportLabel =
    selectedTemplateId === null
      ? "all-levies"
      : selectedTemplate?.period_label.replace(/\s+/g, "-") ?? "levy";

  const handleExportDefaulters = () => {
    if (defaultersRows.length === 0) return;
    const rows = defaultersRows.map(({ unit, s }) => {
      const isPartial = !s.paid && s.amountPaid > 0;
      return {
        period: s.periodLabel,
        period_window: formatWindow(s.periodStart, s.periodEnd),
        flat_number: unit.flat_number,
        owner_name: unit.owner_name,
        amount: s.amountOwed,
        status: isPartial ? "Partial" : "Outstanding",
      };
    });
    const csv = exportToCSV(rows, [
      { key: "period", header: "Levy" },
      { key: "period_window", header: "Window" },
      { key: "flat_number", header: "Flat" },
      { key: "owner_name", header: "Owner" },
      { key: "amount", header: "Amount (₦)" },
      { key: "status", header: "Status" },
    ]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `service-charge-defaulters-${exportLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const emailPeriodLabel =
    selectedTemplateId === null
      ? "Service charge (all selected levies)"
      : selectedTemplate?.period_label ?? "Service charge";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowNewTemplate(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create levy template
        </button>
        <button
          onClick={() => setShowNewObligation(true)}
          disabled={units.length === 0}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add levy for flat
        </button>
        <button
          onClick={() => setShowRecordPayment(true)}
          disabled={obligationOptions.length === 0}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-900/20"
        >
          Record payment
        </button>
        {defaultersRows.length > 0 && (
          <>
            <button
              onClick={handleExportDefaulters}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Export defaulters CSV
            </button>
            <EmailDefaultersButton
              periodLabel={emailPeriodLabel}
              defaulters={defaultersWithEmail}
            />
          </>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-amber-800 dark:text-amber-200">
            No levy templates yet. Create a template (default amount for new levies) to begin.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTemplateId(null)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                selectedTemplateId === null
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              All levies
            </button>
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplateId(t.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  selectedTemplateId === t.id
                    ? "bg-emerald-600 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {t.period_label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              {selectedTemplateId === null ? (
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  All levies (per-flat amounts and windows)
                </span>
              ) : selectedTemplate ? (
                <>
                  <span className="font-medium">{selectedTemplate.period_label}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Default ₦{Number(selectedTemplate.amount_per_unit).toLocaleString()}
                  </span>
                  {selectedTemplate.due_date && (
                    <span className="text-sm text-zinc-500">
                      Template due:{" "}
                      {format(new Date(selectedTemplate.due_date), "MMM d, yyyy")}
                    </span>
                  )}
                </>
              ) : null}
            </div>

            {tableRows.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No levy obligations for this filter. Use &quot;Add levy for flat&quot; to assign
                an amount and billing window to a unit.
              </p>
            ) : (
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
                        Levy
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                        Window
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
                    {tableRows.map(({ unit, s }) => {
                      const partial = !s.paid && s.amountPaid > 0;
                      return (
                        <tr key={s.periodId}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {unit.flat_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                            {unit.owner_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                            {s.periodLabel}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {formatWindow(s.periodStart, s.periodEnd)}
                          </td>
                          <td className="px-4 py-3">
                            {s.paid ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                                Paid
                              </span>
                            ) : partial ? (
                              <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                                Partial
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                                Outstanding
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {s.paid ? (
                              formatCurrency(s.amountPerUnit)
                            ) : partial ? (
                              <span>
                                <span className="text-zinc-900 dark:text-zinc-100">
                                  {formatCurrency(s.amountPaid)}
                                </span>
                                <span className="text-zinc-500"> / </span>
                                <span className="text-zinc-600 dark:text-zinc-400">
                                  {formatCurrency(s.amountPerUnit)}
                                </span>
                                <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-300">
                                  Owes {formatCurrency(s.amountOwed)}
                                </span>
                              </span>
                            ) : (
                              <span>
                                <span className="font-medium text-amber-800 dark:text-amber-200">
                                  {formatCurrency(s.amountOwed)}
                                </span>
                                <span className="text-zinc-500"> / </span>
                                <span className="text-zinc-500">
                                  {formatCurrency(s.amountPerUnit)}
                                </span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showNewTemplate && (
        <CreateTemplateModal
          onClose={() => setShowNewTemplate(false)}
          onCreated={() => {
            setShowNewTemplate(false);
            router.refresh();
          }}
        />
      )}

      {showNewObligation && (
        <CreateObligationModal
          templates={templates}
          units={units}
          onClose={() => setShowNewObligation(false)}
          onCreated={() => {
            setShowNewObligation(false);
            router.refresh();
          }}
        />
      )}

      {showRecordPayment && obligationOptions.length > 0 && (
        <RecordPaymentModal
          obligations={obligationOptions}
          initialObligationId={
            tableRows[0]?.s.periodId ??
            obligationOptions[0]?.id ??
            null
          }
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
  defaulters,
}: {
  periodLabel: string;
  defaulters: {
    flat_number: string;
    owner_name: string;
    email: string | null;
    amountOwed: number;
  }[];
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
        withEmail.map((d) => ({
          flat_number: d.flat_number,
          owner_name: d.owner_name,
          email: d.email!,
          amountOwed: d.amountOwed,
        }))
      );
      if (result.success) {
        const n =
          "sent" in result && typeof result.sent === "number"
            ? result.sent
            : withEmail.length;
        toast.success(`Reminder sent to ${n} resident(s)`);
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

function CreateTemplateModal({
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
      toast.success("Template created");
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
        <h3 className="mb-4 text-lg font-semibold">Create levy template</h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Default amount per unit when you add a levy for a flat from this template. Each flat
          can still get a custom amount and billing window.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Template label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              placeholder="e.g. 2026 Annual Levy"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Default amount (₦)
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
            <label className="mb-1 block text-sm font-medium">Reference due date (optional)</label>
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

function CreateObligationModal({
  templates,
  units,
  onClose,
  onCreated,
}: {
  templates: LevyTemplate[];
  units: { id: string; flat_number: string; owner_name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(false);

  function onTemplateChange(id: string) {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (t) {
      setLabel(t.period_label);
      setAmount(String(Number(t.amount_per_unit)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId || !label.trim() || !amount || parseFloat(amount) <= 0) return;
    if (!periodStart || !periodEnd) {
      toast.error("Start and end dates are required");
      return;
    }
    if (periodEnd < periodStart) {
      toast.error("End date must be on or after start date");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("service_charge_obligations").insert({
        unit_id: unitId,
        period_template_id: templateId || null,
        label: label.trim(),
        amount: parseFloat(amount),
        period_start: periodStart,
        period_end: periodEnd,
      });
      if (error) throw error;
      toast.success("Levy added for flat");
      onCreated();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Add levy for flat</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Flat</label>
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
            <label className="mb-1 block text-sm font-medium">Template (optional)</label>
            <select
              value={templateId}
              onChange={(e) => onTemplateChange(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
            >
              <option value="">None — custom levy</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.period_label} (default ₦{Number(t.amount_per_unit).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Levy label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              placeholder="e.g. 2026/27 service charge"
              required
            />
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Period start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Period end</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
                required
              />
            </div>
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
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentModal({
  obligations,
  initialObligationId,
  onClose,
  onRecorded,
}: {
  obligations: ObligationOption[];
  initialObligationId: string | null;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const router = useRouter();
  const defaultId = initialObligationId ?? obligations[0]?.id ?? "";
  const defaultOb = obligations.find((o) => o.id === defaultId) ?? obligations[0];

  const [obligationId, setObligationId] = useState(defaultId);
  const [amount, setAmount] = useState(String(defaultOb?.amount ?? 0));
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);

  const selected = obligations.find((o) => o.id === obligationId);

  function handleObligationChange(id: string) {
    setObligationId(id);
    const o = obligations.find((x) => x.id === id);
    if (o) setAmount(String(o.amount));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!obligationId || !selected) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("service_charge_payments").insert({
        obligation_id: obligationId,
        unit_id: selected.unit_id,
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
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-1 text-lg font-semibold">Record service charge payment</h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Post this amount against the selected levy for that flat.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Levy</label>
            <select
              value={obligationId}
              onChange={(e) => handleObligationChange(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              required
            >
              {obligations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.flat_number} — {o.label} ({formatWindow(o.period_start, o.period_end)}) ₦
                  {Number(o.amount).toLocaleString()}
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-1 text-xs text-zinc-500">
                {selected.owner_name} · {formatWindow(selected.period_start, selected.period_end)}
              </p>
            )}
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
            <label className="mb-1 block text-sm font-medium">Payment date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Payment reference</label>
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
