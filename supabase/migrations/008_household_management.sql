-- Household Management: per-unit tasks, expenses, and budget cycles.
-- Private to each household — not visible to committee.

-- Budget cycles per unit
CREATE TABLE household_cycles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name            text,
  budget_amount   numeric(12,2) NOT NULL DEFAULT 0,
  carry_forward   numeric(12,2) NOT NULL DEFAULT 0,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid NOT NULL REFERENCES residents(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Only one active cycle per unit at a time
CREATE UNIQUE INDEX idx_household_cycles_one_active
  ON household_cycles (unit_id) WHERE (is_active = true);

CREATE INDEX idx_household_cycles_unit ON household_cycles(unit_id);

-- Household tasks (todos, grocery lists, items to buy)
CREATE TABLE household_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title           text NOT NULL,
  note            text,
  category        text NOT NULL DEFAULT 'todo' CHECK (category IN ('todo', 'grocery', 'buy')),
  is_completed    boolean NOT NULL DEFAULT false,
  completed_by    uuid REFERENCES residents(id),
  completed_at    timestamptz,
  created_by      uuid NOT NULL REFERENCES residents(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_household_tasks_unit ON household_tasks(unit_id);

-- Household expenses
CREATE TABLE household_expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  cycle_id        uuid REFERENCES household_cycles(id) ON DELETE SET NULL,
  description     text NOT NULL,
  amount          numeric(12,2) NOT NULL,
  expense_date    date NOT NULL DEFAULT CURRENT_DATE,
  created_by      uuid NOT NULL REFERENCES residents(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_household_expenses_unit ON household_expenses(unit_id);
CREATE INDEX idx_household_expenses_cycle ON household_expenses(cycle_id);

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE household_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_expenses ENABLE ROW LEVEL SECURITY;

-- Cycles: unit members only
CREATE POLICY "unit_members_select_cycles"
  ON household_cycles FOR SELECT
  USING (unit_id = my_unit_id());

CREATE POLICY "unit_members_insert_cycles"
  ON household_cycles FOR INSERT
  WITH CHECK (unit_id = my_unit_id());

CREATE POLICY "unit_members_update_cycles"
  ON household_cycles FOR UPDATE
  USING (unit_id = my_unit_id())
  WITH CHECK (unit_id = my_unit_id());

-- Tasks: unit members only
CREATE POLICY "unit_members_select_tasks"
  ON household_tasks FOR SELECT
  USING (unit_id = my_unit_id());

CREATE POLICY "unit_members_insert_tasks"
  ON household_tasks FOR INSERT
  WITH CHECK (unit_id = my_unit_id());

CREATE POLICY "unit_members_update_tasks"
  ON household_tasks FOR UPDATE
  USING (unit_id = my_unit_id())
  WITH CHECK (unit_id = my_unit_id());

CREATE POLICY "unit_members_delete_tasks"
  ON household_tasks FOR DELETE
  USING (unit_id = my_unit_id());

-- Expenses: unit members only
CREATE POLICY "unit_members_select_expenses"
  ON household_expenses FOR SELECT
  USING (unit_id = my_unit_id());

CREATE POLICY "unit_members_insert_expenses"
  ON household_expenses FOR INSERT
  WITH CHECK (unit_id = my_unit_id());

CREATE POLICY "unit_members_update_expenses"
  ON household_expenses FOR UPDATE
  USING (unit_id = my_unit_id())
  WITH CHECK (unit_id = my_unit_id());

CREATE POLICY "unit_members_delete_expenses"
  ON household_expenses FOR DELETE
  USING (unit_id = my_unit_id());
