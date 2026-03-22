"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addExpense, deleteExpense } from "@/lib/actions/household";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  createdAt: string;
  cycleId?: string | null;
  budgetLabel?: string;
}

export function ExpenseList({
  expenses,
  totalSpentActiveBudget,
  totalExpensesAllTime,
  activeCycleId,
}: {
  expenses: ExpenseItem[];
  totalSpentActiveBudget: number;
  totalExpensesAllTime: number;
  activeCycleId: string | null;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  async function handleDelete(id: string) {
    const result = await deleteExpense(id);
    if (result.success) {
      toast.success("Expense removed");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Spent (active budget):{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(totalSpentActiveBudget)}
            </span>
          </p>
          <p className="mt-0.5">
            Total expenses (all-time):{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(totalExpensesAllTime)}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add expense
        </button>
      </div>

      {expenses.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {activeCycleId
            ? "No expenses recorded yet."
            : "Add a budget to track new expenses against it. Past expenses still appear here once recorded."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Budget
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {expenses.map((e) => (
                <tr key={e.id} className="group">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {format(new Date(e.expenseDate), "MMM d, yyyy")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {e.budgetLabel ?? (e.cycleId ? "—" : "No budget")}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                    {e.description}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      title="Delete"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddExpenseModal
          cycleId={activeCycleId}
          onClose={() => setShowModal(false)}
          onAdded={() => {
            setShowModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddExpenseModal({
  cycleId,
  onClose,
  onAdded,
}: {
  cycleId: string | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    setLoading(true);
    const result = await addExpense(description, n, expenseDate, cycleId);
    if (result.success) {
      toast.success("Expense added");
      onAdded();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold">Add expense</h3>
        {!cycleId && (
          <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            No active budget. Add a budget first to attach new expenses to it.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="e.g. Cooking gas"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
              disabled={loading || !cycleId}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
