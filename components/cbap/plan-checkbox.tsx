"use client";

import { useTransition, useState } from "react";
import { togglePlanItem } from "@/lib/actions/cbap";

export function PlanCheckbox({ taskKey, label, initialDone }: { taskKey: string; label: string; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone);
  const [pending, start] = useTransition();
  return (
    <label className={`flex items-center gap-2 text-sm ${done ? "line-through opacity-60" : ""}`}>
      <input type="checkbox" checked={done} disabled={pending}
        onChange={(e) => { const v = e.target.checked; setDone(v); start(async () => { await togglePlanItem(taskKey, v); }); }} />
      {label}
    </label>
  );
}
