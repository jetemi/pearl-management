"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { setExamDate } from "@/lib/actions/cbap";

export function ExamDateForm({ current }: { current: string | null }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => {
        const res = await setExamDate(String(fd.get("d")));
        if (res.success) toast.success("Exam date saved");
        else toast.error(res.error);
      })}
      className="flex items-end gap-2"
    >
      <label className="text-sm">
        Exam date
        <input type="date" name="d" defaultValue={current ?? ""} required
          className="ml-2 rounded-md border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent" />
      </label>
      <button disabled={pending} className="rounded-md border border-black/15 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/20">
        Save
      </button>
    </form>
  );
}
