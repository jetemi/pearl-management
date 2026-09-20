"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { setDailyTarget } from "@/lib/actions/cbap";

export function DailyTargetForm({ current, bankSize }: { current: number; bankSize: number }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await setDailyTarget(Number(fd.get("t")));
          if (res.success) toast.success(`Daily target set to ${res.target}`);
          else toast.error(res.error);
        })
      }
      className="flex flex-wrap items-end gap-2"
    >
      <label className="text-sm">
        Questions per day
        <input
          type="number"
          name="t"
          min={5}
          max={60}
          step={1}
          defaultValue={current}
          required
          className="ml-2 w-20 rounded-md border border-black/15 px-2 py-1 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <button
        disabled={pending}
        className="rounded-md border border-black/15 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/20"
      >
        Save
      </button>
      <span className="text-xs opacity-60">
        {bankSize} in the bank · ~{Math.ceil(bankSize / Math.max(1, current))} days for one full pass
      </span>
    </form>
  );
}
