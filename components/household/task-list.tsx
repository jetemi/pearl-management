"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addTask, toggleTask, deleteTask, updateTask } from "@/lib/actions/household";

export interface TaskItem {
  id: string;
  title: string;
  note: string | null;
  category: "todo" | "grocery" | "buy";
  isCompleted: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { value: "todo", label: "To-do" },
  { value: "grocery", label: "Grocery" },
  { value: "buy", label: "Buy" },
] as const;

export function TaskList({ tasks }: { tasks: TaskItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<string>("todo");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.category === filter);
  const pending = filtered.filter((t) => !t.isCompleted);
  const completed = filtered.filter((t) => t.isCompleted);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    const result = await addTask(title, category, note);
    if (result.success) {
      toast.success("Added");
      setTitle("");
      setNote("");
      setCategory("todo");
      setShowForm(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setAdding(false);
  }

  async function handleToggle(id: string) {
    setTogglingId(id);
    const result = await toggleTask(id);
    if (!result.success) toast.error(result.error);
    router.refresh();
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    const result = await deleteTask(id);
    if (result.success) {
      toast.success("Removed");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All ({tasks.length})
          </FilterButton>
          {CATEGORIES.map((c) => {
            const count = tasks.filter((t) => t.category === c.value).length;
            return (
              <FilterButton
                key={c.value}
                active={filter === c.value}
                onClick={() => setFilter(c.value)}
              >
                {c.label} ({count})
              </FilterButton>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {showForm ? "Cancel" : "Add item"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
              autoFocus
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note..."
            className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No items yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-1">
          {pending.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              toggling={togglingId === task.id}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
          {completed.length > 0 && (
            <>
              <p className="pt-3 text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">
                Completed ({completed.length})
              </p>
              {completed.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  toggling={togglingId === task.id}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  toggling,
  onToggle,
  onDelete,
}: {
  task: TaskItem;
  toggling: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNote, setEditNote] = useState(task.note ?? "");
  const [editCategory, setEditCategory] = useState(task.category);
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setEditTitle(task.title);
    setEditNote(task.note ?? "");
    setEditCategory(task.category);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditTitle(task.title);
    setEditNote(task.note ?? "");
    setEditCategory(task.category);
  }

  async function saveEdit() {
    setSaving(true);
    const result = await updateTask(
      task.id,
      editTitle,
      editCategory,
      editNote
    );
    if (result.success) {
      toast.success("Saved");
      setEditing(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Title"
            />
            <input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Note (optional)"
            />
            <select
              value={editCategory}
              onChange={(e) =>
                setEditCategory(e.target.value as TaskItem["category"])
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm sm:w-auto dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || !editTitle.trim()}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => onToggle(task.id)}
        disabled={toggling}
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
          task.isCompleted
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-zinc-300 dark:border-zinc-600"
        }`}
      >
        {task.isCompleted && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={openEdit}
          className={`text-left text-sm ${
            task.isCompleted
              ? "text-zinc-400 line-through dark:text-zinc-500"
              : "text-zinc-900 dark:text-zinc-100"
          } hover:underline`}
        >
          {task.title}
        </button>
        {task.note && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {task.note}
          </p>
        )}
      </div>
      <CategoryBadge category={task.category} />
      <button
        type="button"
        onClick={openEdit}
        className="flex-shrink-0 text-zinc-400 opacity-0 transition-opacity hover:text-emerald-600 group-hover:opacity-100"
        title="Edit"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
      <button
        onClick={() => onDelete(task.id)}
        className="flex-shrink-0 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        title="Delete"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    todo: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    grocery:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    buy: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  const labels: Record<string, string> = {
    todo: "To-do",
    grocery: "Grocery",
    buy: "Buy",
  };
  return (
    <span
      className={`inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles[category] ?? styles.todo}`}
    >
      {labels[category] ?? category}
    </span>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
