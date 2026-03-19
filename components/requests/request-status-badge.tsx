import type { ResidentRequestStatus } from "@/lib/actions/requests";

const styles: Record<ResidentRequestStatus, string> = {
  open: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  closed: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
};

const labels: Record<ResidentRequestStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  closed: "Closed",
};

export function RequestStatusBadge({ status }: { status: ResidentRequestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
