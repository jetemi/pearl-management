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

export type PastCycleData = CycleData & {
  endedAt: string | null;
  spent: number;
};

export function CycleSummary({
  activeCycle,
  pastCycles,
  totalSpent,
  totalExpensesAllTime,
  totalIncomeAllTime,
}: {
  activeCycle: CycleData | null;
  pastCycles: PastCycleData[];
  totalSpent: number;
  totalExpensesAllTime: number;
  totalIncomeAllTime: number;
}) {
  const router = useRouter();
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [ending, setEnding] = useState(false);

  async function handleEndBudget() {
    if (!activeCycle) return;
    setEnding(true);
    const result = await endCycle(activeCycle.id);
    if (result.success) {
      toast.success("Budget ended");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setEnding(false);
  }

  const allTimeBalance = totalIncomeAllTime - totalExpensesAllTime;

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
          <p className="mb-3 text-zinc-600 dark:text-zinc-400">
            No active budget.
          </p>
          <button
            onClick={() => setShowNewBudget(true)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add new budget
          </button>
        </div>

        {pastCycles.length > 0 && <CycleHistory cycles={pastCycles} />}

        {showNewBudget && (
          <NewBudgetModal
            onClose={() => setShowNewBudget(false)}
            onCreated={() => {
              setShowNewBudget(false);
              router.refresh();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Budget"
          value={formatCurrency(activeCycle.budgetAmount)}
        />
        <StatCard title="Spent" value={formatCurrency(totalSpent)} />
        <StatCard
          title="Total expenses"
          value={formatCurrency(totalExpensesAllTime)}
          sub="All-time"
        />
        <StatCard
          title="All-time income"
          value={formatCurrency(totalIncomeAllTime)}
          sub="Sum of all budgets"
        />
        <StatCard
          title="Balance"
          value={formatCurrency(allTimeBalance)}
          highlight={allTimeBalance < 0 ? "negative" : "positive"}
          sub="Income − expenses"
        />
      </div>

      {activeCycle.name && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Budget: <span className="font-medium">{activeCycle.name}</span>{" "}
          &middot; Started{" "}
          {format(new Date(activeCycle.startedAt), "MMM d, yyyy")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowNewBudget(true)}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          Add new budget
        </button>
        <button
          onClick={handleEndBudget}
          disabled={ending}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {ending ? "Ending..." : "End budget"}
        </button>
      </div>

      {pastCycles.length > 0 && <CycleHistory cycles={pastCycles} />}

      {showNewBudget && (
        <NewBudgetModal
          onClose={() => setShowNewBudget(false)}
          onCreated={() => {
            setShowNewBudget(false);
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

function CycleHistory({ cycles }: { cycles: PastCycleData[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
        Past budgets
      </h3>
      <div className="space-y-2">
        {cycles.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
          >
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {c.name || "Unnamed budget"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Budget: {formatCurrency(c.budgetAmount)} &middot; Spent:{" "}
                {formatCurrency(c.spent)}
              </p>
            </div>
            <p className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
              {format(new Date(c.startedAt), "MMM d, yyyy")}
              {c.endedAt && (
                <>
                  {" "}
                  – {format(new Date(c.endedAt), "MMM d, yyyy")}
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewBudgetModal({
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
      toast.success("Budget started");
      onCreated();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Add new budget</h3>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          If there is an active budget, its remaining balance will carry
          forward automatically.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Budget name
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
              placeholder="How much to spend this period"
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
              {loading ? "Starting..." : "Start budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
