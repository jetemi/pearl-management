"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";

type Result =
  | { success: true; id?: string }
  | { success: false; error: string };

async function getResidentWithUnit() {
  const resident = await getCurrentResident();
  if (!resident) return { resident: null, error: "Not signed in" } as const;
  if (!resident.unit_id)
    return { resident: null, error: "No unit assigned" } as const;
  return { resident, error: null } as const;
}

// ── Tasks ────────────────────────────────────────────────────────────

export async function addTask(
  title: string,
  category: string,
  note?: string
): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const t = title.trim();
  if (!t) return { success: false, error: "Title is required" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_tasks")
    .insert({
      unit_id: resident.unit_id,
      title: t,
      note: note?.trim() || null,
      category,
      created_by: resident.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function toggleTask(taskId: string): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const supabase = await createClient();

  const { data: task, error: fetchErr } = await supabase
    .from("household_tasks")
    .select("is_completed")
    .eq("id", taskId)
    .single();

  if (fetchErr || !task) return { success: false, error: "Task not found" };

  const nowCompleted = !task.is_completed;
  const { error } = await supabase
    .from("household_tasks")
    .update({
      is_completed: nowCompleted,
      completed_by: nowCompleted ? resident.id : null,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateTask(
  taskId: string,
  title: string,
  category: string,
  note?: string
): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const t = title.trim();
  if (!t) return { success: false, error: "Title is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("household_tasks")
    .update({
      title: t,
      note: note?.trim() || null,
      category,
    })
    .eq("id", taskId)
    .eq("unit_id", resident.unit_id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const supabase = await createClient();
  const { error } = await supabase
    .from("household_tasks")
    .delete()
    .eq("id", taskId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Expenses ─────────────────────────────────────────────────────────

export async function addExpense(
  description: string,
  amount: number,
  expenseDate: string,
  cycleId: string | null
): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const d = description.trim();
  if (!d) return { success: false, error: "Description is required" };
  if (amount <= 0) return { success: false, error: "Amount must be positive" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_expenses")
    .insert({
      unit_id: resident.unit_id,
      cycle_id: cycleId,
      description: d,
      amount,
      expense_date: expenseDate,
      created_by: resident.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function deleteExpense(expenseId: string): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const supabase = await createClient();
  const { error } = await supabase
    .from("household_expenses")
    .delete()
    .eq("id", expenseId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Cycles ───────────────────────────────────────────────────────────

export async function startNewCycle(
  name: string,
  budgetAmount: number
): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const supabase = await createClient();

  // Calculate carry-forward from the current active cycle
  let carryForward = 0;
  const { data: activeCycle } = await supabase
    .from("household_cycles")
    .select("id, budget_amount, carry_forward")
    .eq("unit_id", resident.unit_id)
    .eq("is_active", true)
    .single();

  if (activeCycle) {
    const { data: expenses } = await supabase
      .from("household_expenses")
      .select("amount")
      .eq("cycle_id", activeCycle.id);

    const totalSpent = (expenses ?? []).reduce(
      (s, e) => s + Number(e.amount),
      0
    );
    carryForward =
      Number(activeCycle.carry_forward) +
      Number(activeCycle.budget_amount) -
      totalSpent;

    // Close the active cycle
    const { error: closeErr } = await supabase
      .from("household_cycles")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("id", activeCycle.id);

    if (closeErr) return { success: false, error: closeErr.message };
  }

  const { data, error } = await supabase
    .from("household_cycles")
    .insert({
      unit_id: resident.unit_id,
      name: name.trim() || null,
      budget_amount: budgetAmount,
      carry_forward: carryForward,
      is_active: true,
      created_by: resident.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function endCycle(cycleId: string): Promise<Result> {
  const { resident, error: authErr } = await getResidentWithUnit();
  if (!resident) return { success: false, error: authErr };

  const supabase = await createClient();
  const { error } = await supabase
    .from("household_cycles")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("id", cycleId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
