import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentResident } from "@/lib/auth";
import { HouseholdView } from "@/components/household/household-view";

export default async function HouseholdPage() {
  const resident = await getCurrentResident();
  if (!resident || !resident.unit_id) redirect("/my");

  const supabase = await createClient();
  const unitId = resident.unit_id;

  const [
    { data: activeCycle },
    { data: pastCycles },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from("household_cycles")
      .select("*")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("household_cycles")
      .select("*")
      .eq("unit_id", unitId)
      .eq("is_active", false)
      .order("ended_at", { ascending: false }),
    supabase
      .from("household_tasks")
      .select("*")
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false }),
  ]);

  let expenses: typeof cycleExpenses = [];
  let totalSpent = 0;
  type CycleExpense = {
    id: string;
    description: string;
    amount: number;
    expense_date: string;
    created_by: string;
    created_at: string;
    cycle_id: string | null;
  };
  let cycleExpenses: CycleExpense[] = [];

  if (activeCycle) {
    const { data } = await supabase
      .from("household_expenses")
      .select("*")
      .eq("cycle_id", activeCycle.id)
      .order("expense_date", { ascending: false });
    cycleExpenses = (data ?? []) as CycleExpense[];
    expenses = cycleExpenses;
    totalSpent = cycleExpenses.reduce((s, e) => s + Number(e.amount), 0);
  }

  return (
    <HouseholdView
      activeCycle={
        activeCycle
          ? {
              id: activeCycle.id,
              name: activeCycle.name,
              budgetAmount: Number(activeCycle.budget_amount),
              carryForward: Number(activeCycle.carry_forward),
              startedAt: activeCycle.started_at,
            }
          : null
      }
      pastCycles={(pastCycles ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        budgetAmount: Number(c.budget_amount),
        carryForward: Number(c.carry_forward),
        startedAt: c.started_at,
        endedAt: c.ended_at,
      }))}
      tasks={(tasks ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        note: t.note,
        category: t.category as "todo" | "grocery" | "buy",
        isCompleted: t.is_completed,
        createdAt: t.created_at,
      }))}
      expenses={expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        expenseDate: e.expense_date,
        createdAt: e.created_at,
      }))}
      totalSpent={totalSpent}
    />
  );
}
