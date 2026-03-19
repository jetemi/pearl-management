"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateResidentPhone, updateResidentRole } from "@/lib/actions/residents";
import type { ResidentRole } from "@/lib/auth-roles";

interface ResidentRow {
  id: string;
  unit_id: string | null;
  role: ResidentRole;
  phone: string | null;
  units:
    | { flat_number: string; owner_name: string; phone: string | null }
    | {
        flat_number: string;
        owner_name: string;
        phone: string | null;
      }[]
    | null;
}

const ROLES: ResidentRole[] = [
  "resident",
  "treasurer",
  "secretary",
  "chairman",
  "facility_manager",
];

export function ResidentsTable({ residents }: { residents: ResidentRow[] }) {
  const router = useRouter();

  async function handlePhoneSave(residentId: string, value: string) {
    try {
      await updateResidentPhone(residentId, value || null);
      toast.success("Phone updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update phone");
    }
  }

  async function handleRoleChange(residentId: string, newRole: ResidentRole) {
    try {
      await updateResidentRole(residentId, newRole);
      toast.success("Role updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Unit
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Phone (WhatsApp)
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Change role
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {residents.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {Array.isArray(r.units) ? r.units[0]?.flat_number : r.units?.flat_number ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.role === "chairman"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                      : r.role === "treasurer" || r.role === "secretary"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                        : r.role === "facility_manager"
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {r.role}
                </span>
              </td>
              <td className="max-w-[14rem] px-4 py-3">
                <PhoneCell
                  residentId={r.id}
                  initialPhone={r.phone ?? ""}
                  unitPhone={
                    Array.isArray(r.units)
                      ? r.units[0]?.phone ?? null
                      : r.units?.phone ?? null
                  }
                  onSave={handlePhoneSave}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <select
                  value={r.role}
                  onChange={(e) =>
                    handleRoleChange(r.id, e.target.value as ResidentRole)
                  }
                  className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {residents.length === 0 && (
        <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
          No residents yet. Add units and link residents via Units.
        </div>
      )}
    </div>
  );
}

function PhoneCell({
  residentId,
  initialPhone,
  unitPhone,
  onSave,
}: {
  residentId: string;
  initialPhone: string;
  unitPhone: string | null;
  onSave: (residentId: string, value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initialPhone);
  useEffect(() => {
    setValue(initialPhone);
  }, [initialPhone]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        <input
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 2348012345678"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
        />
        <button
          type="button"
          onClick={() => onSave(residentId, value)}
          className="shrink-0 rounded bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
        >
          Save
        </button>
      </div>
      {unitPhone && (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Unit registry: {unitPhone}
        </p>
      )}
    </div>
  );
}
