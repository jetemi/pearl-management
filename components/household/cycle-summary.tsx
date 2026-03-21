"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { startNewCycle, endCycle } from "@/lib/actions/household";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export interface CycleData {
  id: string;
  name: string | null;
  budgetAmount: number;
  carryForward: number;
  startedAt: string;
  endedAt?: string | null;
}

export function CycleSummary({
  activeCycle,
  pastCycles,
  totalSpent,
}: {
  activeCycle: CycleData | null;
  pastCycles: (CycleData & { endedAt: string | null })[];
  totalSpent: number;
}) {
  const router = useRouter();
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [ending, setEnding] = useState(false);

  async function handleEndCycle() {
    if (!activeCycle) return;
    setEnding(true);
    const result = await endCycle(activeCycle.id);
    if (result.success) {
      toast.success("Cycle ended");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setEnding(false);
  }

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
          <p className="mb-3 text-zinc-600 dark:text-zinc-400">
            No active budget cycle.
          </p>
          <button
            onClick={() => setShowNewCycle(true)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Start a cycle
          </button>
        </div>

        {pastCycles.length > 0 && <CycleHistory cycles={pastCycles} />}

        {showNewCycle && (
          <NewCycleModal
            onClose={() => setShowNewCycle(false)}
            onCreated={() => {
              setShowNewCycle(false);
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  const endBalance =
    activeCycle.carryForward + activeCycle.budgetAmount - totalSpent;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Budget"
          value={formatCurrency(activeCycle.budgetAmount)}
        />
        <StatCard title="Spent" value={formatCurrency(totalSpent)} />
        <StatCard
          title="Carried forward"
          value={formatCurrency(activeCycle.carryForward)}
          sub={activeCycle.carryForward !== 0 ? "From last cycle" : undefined}
        />
        <StatCard
          title="Balance"
          value={formatCurrency(endBalance)}
          highlight={endBalance < 0 ? "negative" : "positive"}
        />
      </div>

      {activeCycle.name && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cycle: <span className="font-medium">{activeCycle.name}</span>{" "}
          &middot; Started{" "}
          {format(new Date(activeCycle.startedAt), "MMM d, yyyy")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowNewCycle(true)}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          Start new cycle
        </button>
        <button
          onClick={handleEndCycle}
          disabled={ending}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {ending ? "Ending..." : "End cycle"}
        </button>
      </div>

      {pastCycles.length > 0 && <CycleHistory cycles={pastCycles} />}

      {showNewCycle && (
        <NewCycleModal
          onClose={() => setShowNewCycle(false)}
          onCreated={() => {
            setShowNewCycle(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  highlight,
}: {
  title: string;
  value: string;
  sub?: string;
  highlight?: "positive" | "negative";
}) {
  const valueColor =
    highlight === "negative"
      ? "text-red-600 dark:text-red-400"
      : highlight === "positive"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-zinc-900 dark:text-zinc-100";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className={`mt-1 text-lg font-semibold ${valueColor}`}>{value}</p>
      {sub && (
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {sub}
        </p>
      )}
    </div>
  );
}

function CycleHistory({
  cycles,
}: {
  cycles: (CycleData & { endedAt: string | null })[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
        Past cycles
      </h3>
      <div className="space-y-2">
        {cycles.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {c.name || "Unnamed cycle"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Budget: {formatCurrency(c.budgetAmount)}
                {c.carryForward !== 0 && (
                  <> &middot; Carry: {formatCurrency(c.carryForward)}</>
                )}
              </p>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {format(new Date(c.startedAt), "MMM yyyy")}
              {c.endedAt && <> – {format(new Date(c.endedAt), "MMM yyyy")}</>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewCycleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(budget);
    if (!n || n < 0) return;
    setLoading(true);
    const result = await startNewCycle(name, n);
    if (result.success) {
      toast.success("Cycle started");
      onCreated();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Start new budget cycle</h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          If there is an active cycle, its remaining balance will carry forward
          automatically.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Cycle name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. March 2026"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Budget amount
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="How much to spend this cycle"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-zinc-600 hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start cycle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
