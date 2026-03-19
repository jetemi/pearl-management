"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { addUnit, addResidentToUnit, importUnitsFromCSV } from "@/lib/actions/units";

export interface Unit {
  id: string;
  flat_number: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export function UnitsTable({ units }: { units: Unit[] }) {
  const [list, setList] = useState(units);
  const [editing, setEditing] = useState<string | null>(null);

  async function toggleActive(unit: Unit) {
    const supabase = createClient();
    const { error } = await supabase
      .from("units")
      .update({ is_active: !unit.is_active })
      .eq("id", unit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setList((prev) =>
      prev.map((u) =>
        u.id === unit.id ? { ...u, is_active: !u.is_active } : u
      )
    );
    toast.success(
      unit.is_active ? "Unit deactivated" : "Unit activated"
    );
  }

  async function handleUpdate(
    id: string,
    data: Partial<Pick<Unit, "flat_number" | "owner_name" | "phone" | "email">>
  ) {
    const supabase = createClient();
    const { error } = await supabase.from("units").update(data).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...data } : u))
    );
    setEditing(null);
    toast.success("Unit updated");
  }

  return (
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
              Phone
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {list.map((unit) => (
            <tr
              key={unit.id}
              className={
                !unit.is_active
                  ? "bg-zinc-50 dark:bg-zinc-900/50"
                  : ""
              }
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {unit.flat_number}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                {unit.owner_name}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {unit.phone ?? "—"}
              </td>
              <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {unit.email ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    unit.is_active
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {unit.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => toggleActive(unit)}
                  className="mr-2 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  {unit.is_active ? "Deactivate" : "Activate"}
                </button>
                {unit.is_active && (
                  <AddResidentButton unit={unit} />
                )}
                <EditUnitButton
                  unit={unit}
                  editing={editing === unit.id}
                  onEdit={() => setEditing(unit.id)}
                  onCancel={() => setEditing(null)}
                  onSave={(data) => handleUpdate(unit.id, data)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && (
        <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
          No units yet. Add your first unit.
        </div>
      )}
    </div>
  );
}

function EditUnitButton({
  unit,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  unit: Unit;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: Partial<Unit>) => void;
}) {
  if (!editing) {
    return (
      <button
        onClick={onEdit}
        className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
      >
        Edit
      </button>
    );
  }
  return (
    <EditUnitForm
      unit={unit}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}

function EditUnitForm({
  unit,
  onSave,
  onCancel,
}: {
  unit: Unit;
  onSave: (data: Partial<Unit>) => void;
  onCancel: () => void;
}) {
  const [flat, setFlat] = useState(unit.flat_number);
  const [owner, setOwner] = useState(unit.owner_name);
  const [phone, setPhone] = useState(unit.phone ?? "");
  const [email, setEmail] = useState(unit.email ?? "");

  return (
    <div className="inline-flex gap-2">
      <input
        value={flat}
        onChange={(e) => setFlat(e.target.value)}
        className="w-20 rounded border px-2 py-1 text-sm"
        placeholder="Flat"
      />
      <input
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        className="w-32 rounded border px-2 py-1 text-sm"
        placeholder="Owner"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-28 rounded border px-2 py-1 text-sm"
        placeholder="Phone"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-36 rounded border px-2 py-1 text-sm"
        placeholder="Email"
      />
      <button
        onClick={() =>
          onSave({
            flat_number: flat,
            owner_name: owner,
            phone: phone || null,
            email: email || null,
          })
        }
        className="text-sm text-emerald-600 hover:text-emerald-700"
      >
        Save
      </button>
      <button onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-700">
        Cancel
      </button>
    </div>
  );
}

function AddResidentButton({ unit }: { unit: Unit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mr-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Add resident
      </button>
      {open && (
        <AddResidentModal
          unit={unit}
          onClose={() => setOpen(false)}
          onAdded={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export function AddUnitButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Add unit
      </button>
      {open && (
        <AddUnitModal
          onClose={() => setOpen(false)}
          onAdded={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function ImportUnitsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Import CSV
      </button>
      {open && (
        <ImportUnitsModal
          onClose={() => setOpen(false)}
          onImported={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ImportUnitsModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ flat: string; success: boolean; error?: string }[] | null>(null);

  function parseCSV(text: string): { flat_number: string; owner_name: string; phone: string | null; email: string | null }[] {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];

    const parseRow = (row: string) => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if ((c === "," && !inQuotes) || (c === "\t" && !inQuotes)) {
          values.push(current.trim());
          current = "";
        } else {
          current += c;
        }
      }
      values.push(current.trim());
      return values;
    };

    const rows = lines.map(parseRow);
    const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const flatIdx = header.findIndex((h) => h === "flat_number" || h === "flat");
    const ownerIdx = header.findIndex((h) => h === "owner_name" || h === "owner");
    const phoneIdx = header.findIndex((h) => h === "phone");
    const emailIdx = header.findIndex((h) => h === "email");

    const hasHeader =
      flatIdx >= 0 ||
      ownerIdx >= 0 ||
      (header[0]?.includes("flat") || header[1]?.includes("owner"));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    return dataRows.map((vals) => ({
      flat_number: (flatIdx >= 0 ? vals[flatIdx] : vals[0]) ?? "",
      owner_name: (ownerIdx >= 0 ? vals[ownerIdx] : vals[1]) ?? "",
      phone: phoneIdx >= 0 && vals[phoneIdx] ? vals[phoneIdx] : null,
      email: emailIdx >= 0 && vals[emailIdx] ? vals[emailIdx] : null,
    }));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResults(null);
    setLoading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setError("No valid rows found. CSV should have columns: flat_number, owner_name, phone, email");
        setLoading(false);
        return;
      }
      const res = await importUnitsFromCSV(rows);
      setResults(res);
      const successCount = res.filter((r) => r.success).length;
      if (successCount > 0) {
        toast.success(`Imported ${successCount} unit(s)`);
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      toast.error("Import failed");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Import units from CSV</h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          CSV should have columns: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">flat_number</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">owner_name</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">phone</code>,{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">email</code>
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          disabled={loading}
          className="mb-4 block w-full text-sm"
        />
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        {results && (
          <div className="mb-4 max-h-40 overflow-y-auto rounded border border-zinc-200 p-2 text-xs dark:border-zinc-700">
            {results.map((r, i) => (
              <div key={i} className={r.success ? "text-emerald-600" : "text-red-600"}>
                {r.flat}: {r.success ? "OK" : r.error}
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AddResidentModal({
  unit,
  onClose,
  onAdded,
}: {
  unit: Unit;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await addResidentToUnit(unit.id, email.trim());
      toast.success("Resident added to unit");
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add resident");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">
          Add resident to {unit.flat_number}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="resident@example.com"
              required
            />
            <p className="mt-1 text-xs text-zinc-500">
              They must have signed up via /login first.
            </p>
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
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddUnitModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const router = useRouter();
  const [flat, setFlat] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!flat.trim() || !owner.trim()) return;
    setLoading(true);
    try {
      await addUnit({
        flat_number: flat.trim(),
        owner_name: owner.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      toast.success("Unit added");
      onAdded();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add unit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Add unit</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Flat number</label>
            <input
              value={flat}
              onChange={(e) => setFlat(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g. A1"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Owner name</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="08012345678"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="owner@example.com"
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
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
