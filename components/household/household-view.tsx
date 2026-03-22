"use client";

import { useState } from "react";
import { TaskList, type TaskItem } from "./task-list";
import { ExpenseList, type ExpenseItem } from "./expense-list";
import { CycleSummary, type CycleData, type PastCycleData } from "./cycle-summary";

type Tab = "tasks" | "expenses" | "budget";

const TABS: { key: Tab; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "expenses", label: "Expenses" },
  { key: "budget", label: "Budget" },
];

export function HouseholdView({
  activeCycle,
  pastCycles,
  tasks,
  expenses,
  totalSpent,
  totalExpensesAllTime,
  totalIncomeAllTime,
}: {
  activeCycle: CycleData | null;
  pastCycles: PastCycleData[];
  tasks: TaskItem[];
  expenses: ExpenseItem[];
  totalSpent: number;
  totalExpensesAllTime: number;
  totalIncomeAllTime: number;
}) {
  const [tab, setTab] = useState<Tab>("tasks");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Household
        </h1>
        {activeCycle && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {activeCycle.name ?? "Active budget"}
          </span>
        )}
      </div>

      <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
            {t.key === "tasks" && tasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                {tasks.filter((x) => !x.isCompleted).length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "tasks" && <TaskList tasks={tasks} />}
      {tab === "expenses" && (
        <ExpenseList
          expenses={expenses}
          totalSpentActiveBudget={totalSpent}
          totalExpensesAllTime={totalExpensesAllTime}
          activeCycleId={activeCycle?.id ?? null}
        />
      )}
      {tab === "budget" && (
        <CycleSummary
          activeCycle={activeCycle}
          pastCycles={pastCycles}
          totalSpent={totalSpent}
          totalExpensesAllTime={totalExpensesAllTime}
          totalIncomeAllTime={totalIncomeAllTime}
        />
      )}
    </div>
  );
}
