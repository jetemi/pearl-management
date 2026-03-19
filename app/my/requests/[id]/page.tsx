import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import type { ResidentRequestStatus } from "@/lib/actions/requests";
import { flatNumberFromUnitsJoin } from "@/lib/utils";

export default async function MyRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = await getCurrentResident();
  if (!resident) redirect("/login");

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("resident_requests")
    .select(
      "id, title, body, status, created_at, updated_at, created_by, units(flat_number)"
    )
    .eq("id", id)
    .single();

  if (error || !row) notFound();
  if (row.created_by !== resident.id) notFound();

  const flat = flatNumberFromUnitsJoin(
    row.units as
      | { flat_number: string }
      | { flat_number: string }[]
      | null
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/my/requests"
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          ← All requests
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {row.title}
          </h1>
          <RequestStatusBadge status={row.status as ResidentRequestStatus} />
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Flat {flat} · Submitted{" "}
          {format(new Date(row.created_at), "MMM d, yyyy · h:mm a")}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-medium uppercase text-zinc-500 dark:text-zinc-400">
          Message
        </h2>
        <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
          {row.body}
        </p>
      </div>
    </div>
  );
}
