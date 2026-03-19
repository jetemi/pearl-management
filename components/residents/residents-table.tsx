"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateResidentRole } from "@/lib/actions/residents";
import type { ResidentRole } from "@/lib/auth";

interface ResidentRow {
  id: string;
  unit_id: string | null;
  role: ResidentRole;
  units: { flat_number: string; owner_name: string } | { flat_number: string; owner_name: string }[] | null;
}

const ROLES: ResidentRole[] = [
  "resident",
  "treasurer",
  "secretary",
  "chairman",
];

export function ResidentsTable({ residents }: { residents: ResidentRow[] }) {
  const router = useRouter();

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
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {r.role}
                </span>
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
