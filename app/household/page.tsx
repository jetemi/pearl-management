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
    { data: allExpensesRows },
    { data: allCyclesForUnit },
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
    supabase
      .from("household_expenses")
      .select("*")
      .eq("unit_id", unitId)
      .order("expense_date", { ascending: false }),
    supabase
      .from("household_cycles")
      .select("id, name, budget_amount")
      .eq("unit_id", unitId),
  ]);

  const cycleNameById = new Map(
    (allCyclesForUnit ?? []).map((c) => [c.id, c.name ?? "Unnamed budget"])
  );

  const totalExpensesAllTime = (allExpensesRows ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0
  );
  const totalIncomeAllTime = (allCyclesForUnit ?? []).reduce(
    (s, c) => s + Number(c.budget_amount),
    0
  );

  const spentByCycleId = new Map<string, number>();
  for (const e of allExpensesRows ?? []) {
    if (!e.cycle_id) continue;
    spentByCycleId.set(
      e.cycle_id,
      (spentByCycleId.get(e.cycle_id) ?? 0) + Number(e.amount)
    );
  }

  let totalSpentActiveBudget = 0;
  if (activeCycle) {
    totalSpentActiveBudget = spentByCycleId.get(activeCycle.id) ?? 0;
  }

  const pastCyclesWithSpent = (pastCycles ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    budgetAmount: Number(c.budget_amount),
    carryForward: Number(c.carry_forward),
    startedAt: c.started_at,
    endedAt: c.ended_at,
    spent: spentByCycleId.get(c.id) ?? 0,
  }));

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
      pastCycles={pastCyclesWithSpent}
      tasks={(tasks ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        note: t.note,
        category: t.category as "todo" | "grocery" | "buy",
        isCompleted: t.is_completed,
        createdAt: t.created_at,
      }))}
      expenses={(allExpensesRows ?? []).map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        expenseDate: e.expense_date,
        createdAt: e.created_at,
        cycleId: e.cycle_id,
        budgetLabel: e.cycle_id
          ? (cycleNameById.get(e.cycle_id) ?? "Budget")
          : "No budget",
      }))}
      totalSpent={totalSpentActiveBudget}
      totalExpensesAllTime={totalExpensesAllTime}
      totalIncomeAllTime={totalIncomeAllTime}
    />
  );
}
