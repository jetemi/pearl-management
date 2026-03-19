"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  updateResidentRequestStatus,
  type ResidentRequestStatus,
} from "@/lib/actions/requests";

const OPTIONS: { value: ResidentRequestStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
];

export function UpdateRequestStatus({
  requestId,
  current,
}: {
  requestId: string;
  current: ResidentRequestStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [loading, setLoading] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ResidentRequestStatus;
    setLoading(true);
    try {
      const result = await updateResidentRequestStatus(requestId, next);
      if (!result.success) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      setStatus(next);
      toast.success("Status updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="req-status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Status
      </label>
      <select
        id="req-status"
        value={status}
        disabled={loading}
        onChange={onChange}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
