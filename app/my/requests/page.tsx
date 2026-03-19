import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
import { NewRequestForm } from "@/components/requests/new-request-form";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import type { ResidentRequestStatus } from "@/lib/actions/requests";

export default async function MyRequestsPage() {
  const resident = await getCurrentResident();
  if (!resident) redirect("/login");

  if (resident.role === "facility_manager") {
    redirect("/admin/requests");
  }

  if (!resident.unit_id) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-900/20">
        <p className="text-amber-800 dark:text-amber-200">
          Your account is not yet linked to a unit. Please contact the estate
          committee.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("resident_requests")
    .select("id, title, status, created_at")
    .eq("created_by", resident.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/my"
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Requests to facility
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Submit a request and every facility manager (by login email) is
          notified. After submitting, you can open WhatsApp for each manager
          whose phone is on file.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          New request
        </h2>
        <NewRequestForm />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Your requests
        </h2>
        {rows && rows.length > 0 ? (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/my/requests/${r.id}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {r.title}
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {format(new Date(r.created_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <RequestStatusBadge status={r.status as ResidentRequestStatus} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No requests yet.
          </p>
        )}
      </div>
    </div>
  );
}
