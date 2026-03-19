"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface Service {
  id: string;
  name: string;
  frequency: string | null;
  description: string | null;
  is_active: boolean;
}

type LogStatus = "done" | "partial" | "missed";

export function FacilityView({
  services,
  months,
  logMap,
}: {
  services: Service[];
  months: Date[];
  logMap: Map<string, { status: string; notes: string | null }>;
}) {
  const router = useRouter();
  const [showManageServices, setShowManageServices] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    serviceId: string;
    periodMonth: string;
  } | null>(null);

  const getLogKey = (serviceId: string, periodMonth: Date) =>
    `${serviceId}-${format(periodMonth, "yyyy-MM-dd")}`;

  const getStatus = (serviceId: string, periodMonth: Date) => {
    const key = getLogKey(serviceId, periodMonth);
    return logMap.get(key);
  };

  const statusColors: Record<string, string> = {
    done: "bg-emerald-500",
    partial: "bg-amber-500",
    missed: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setShowManageServices(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Manage services
        </button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-amber-800 dark:text-amber-200">
            No facility services defined. Add services (e.g. &quot;Security
            manning&quot;, &quot;Generator servicing&quot;) to track monthly
            delivery.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="sticky left-0 z-10 min-w-[200px] border-b border-r border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  Service
                </th>
                {months.map((m) => (
                  <th
                    key={m.toISOString()}
                    className="min-w-[100px] border-b border-zinc-200 px-4 py-3 text-center text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                  >
                    {format(m, "MMM yyyy")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {services.map((svc) => (
                <tr key={svc.id} className="divide-x divide-zinc-200 dark:divide-zinc-800">
                  <td className="sticky left-0 z-10 min-w-[200px] border-r border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                    <div>
                      <span className="font-medium">{svc.name}</span>
                      {svc.frequency && (
                        <span className="ml-2 text-xs text-zinc-500">
                          ({svc.frequency})
                        </span>
                      )}
                    </div>
                  </td>
                  {months.map((m) => {
                    const periodStr = format(m, "yyyy-MM-dd");
                    const isEditing =
                      editingCell?.serviceId === svc.id &&
                      editingCell?.periodMonth === periodStr;
                    const existing = getStatus(svc.id, m);

                    return (
                      <td
                        key={m.toISOString()}
                        className="min-w-[100px] p-1 text-center"
                      >
                        {isEditing ? (
                          <LogCellEditor
                            serviceId={svc.id}
                            periodMonth={periodStr}
                            initialStatus={(existing?.status as LogStatus) ?? null}
                            initialNotes={existing?.notes ?? ""}
                            onSave={() => {
                              setEditingCell(null);
                              router.refresh();
                            }}
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : (
                          <button
                            onClick={() =>
                              setEditingCell({ serviceId: svc.id, periodMonth: periodStr })
                            }
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:ring-2 hover:ring-emerald-500 ${
                              existing
                                ? statusColors[existing.status] ?? "bg-zinc-200"
                                : "bg-zinc-100 dark:bg-zinc-800"
                            } ${existing ? "text-white" : "text-zinc-500"}`}
                            title={
                              existing
                                ? `${existing.status}${existing.notes ? `: ${existing.notes}` : ""}`
                                : "Click to log"
                            }
                          >
                            {existing ? (
                              existing.status === "done" ? (
                                "✓"
                              ) : existing.status === "partial" ? (
                                "~"
                              ) : (
                                "✗"
                              )
                            ) : (
                              "—"
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-zinc-500">
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-emerald-500" /> Done
        </span>
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-amber-500" /> Partial
        </span>
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded bg-red-500" /> Missed
        </span>
      </div>

      {showManageServices && (
        <ManageServicesModal
          services={services}
          onClose={() => setShowManageServices(false)}
          onSaved={() => {
            setShowManageServices(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function LogCellEditor({
  serviceId,
  periodMonth,
  initialStatus,
  initialNotes,
  onSave,
  onCancel,
}: {
  serviceId: string;
  periodMonth: string;
  initialStatus: LogStatus | null;
  initialNotes: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<LogStatus | "">(
    initialStatus ?? ""
  );
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!status) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("facility_logs").upsert(
        {
          service_id: serviceId,
          period_month: periodMonth,
          status,
          notes: notes.trim() || null,
          logged_by: user?.id ?? null,
        },
        {
          onConflict: "service_id,period_month",
        }
      );
      if (error) throw error;
      toast.success("Log updated");
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from("facility_logs")
        .delete()
        .eq("service_id", serviceId)
        .eq("period_month", periodMonth);
      toast.success("Log cleared");
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 p-2">
      <div className="flex gap-1">
        {(["done", "partial", "missed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              status === s
                ? s === "done"
                  ? "bg-emerald-600 text-white"
                  : s === "partial"
                    ? "bg-amber-600 text-white"
                    : "bg-red-600 text-white"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            {s === "done" ? "✓" : s === "partial" ? "~" : "✗"}
          </button>
        ))}
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="w-full rounded border px-2 py-1 text-xs dark:bg-zinc-800"
      />
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={!status || loading}
          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={handleClear}
          disabled={loading}
          className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
        >
          Clear
        </button>
        <button
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManageServicesModal({
  services,
  onClose,
  onSaved,
}: {
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("facility_services").insert({
        name: name.trim(),
        frequency: frequency.trim() || null,
        description: description.trim() || null,
      });
      if (error) throw error;
      toast.success("Service added");
      setName("");
      setFrequency("");
      setDescription("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("facility_services")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("Service deactivated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Manage facility services</h3>

        <form onSubmit={handleAdd} className="mb-6 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service name (e.g. Security manning)"
            className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
            required
          />
          <input
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="Frequency (e.g. daily, weekly, monthly)"
            className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full rounded border px-3 py-2 dark:bg-zinc-800"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Add service
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Current services
          </p>
          {services.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              <span>
                {s.name}
                {s.frequency && (
                  <span className="ml-2 text-sm text-zinc-500">
                    ({s.frequency})
                  </span>
                )}
              </span>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deletingId === s.id}
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Deactivate
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
