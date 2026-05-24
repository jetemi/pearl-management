"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { markItemReviewed } from "@/lib/actions/cbap";

export function MarkReviewedButton({ taskId, reviewed }: { taskId: string; reviewed: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending || reviewed}
      onClick={() =>
        start(async () => {
          const res = await markItemReviewed(taskId, "task");
          if (res.success) toast.success("Marked reviewed");
          else toast.error(res.error);
        })
      }
      className="rounded-md border border-black/15 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/20"
    >
      {reviewed ? "Reviewed ✓" : pending ? "Saving…" : "Mark reviewed"}
    </button>
  );
}
