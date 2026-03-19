import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
import { canAccessAdminArea } from "@/lib/auth-roles";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import type { ResidentRequestStatus } from "@/lib/actions/requests";
import { flatNumberFromUnitsJoin } from "@/lib/utils";

export default async function AdminRequestsPage() {
  const resident = await getCurrentResident();
  if (!resident) redirect("/login");
  if (!canAccessAdminArea(resident.role)) redirect("/my");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("resident_requests")
    .select("id, title, status, created_at, units(flat_number)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Resident requests
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Requests from residents. Update status as you handle each item.
      </p>

      {rows && rows.length > 0 ? (
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
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {rows.map((r) => {
                const flat = flatNumberFromUnitsJoin(
                  r.units as
                    | { flat_number: string }
                    | { flat_number: string }[]
                    | null
                );
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {format(new Date(r.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {flat}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/admin/requests/${r.id}`}
                        className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge
                        status={r.status as ResidentRequestStatus}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-zinc-500 dark:text-zinc-400">No requests yet.</p>
      )}
    </div>
  );
}
