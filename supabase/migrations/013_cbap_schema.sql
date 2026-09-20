-- CBAP Study App schema (detachable). Run in Supabase SQL Editor or: supabase db push
-- All tables store per-user progress only; study content lives in code (lib/cbap/content).
-- Every table is keyed to auth.users(id) and RLS-restricted to the owning user.

-- Per-user settings (one row per user)
CREATE TABLE cbap_settings (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_date        date,
  daily_card_goal  integer NOT NULL DEFAULT 30,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Spaced-repetition state, one row per (user, flashcard)
CREATE TABLE cbap_flashcard_state (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id          text NOT NULL,
  ease             numeric NOT NULL DEFAULT 2.5,
  interval_days    integer NOT NULL DEFAULT 0,
  repetitions      integer NOT NULL DEFAULT 0,
  due_date         date NOT NULL DEFAULT (now()::date),
  last_reviewed_at timestamptz,
  PRIMARY KEY (user_id, card_id)
);

-- Quiz attempts (practice + mock)
CREATE TABLE cbap_quiz_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode             text NOT NULL CHECK (mode IN ('practice', 'mock')),
  ka_id            text,
  score            integer NOT NULL,
  total            integer NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  details          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- "Learn" items marked reviewed
CREATE TABLE cbap_item_progress (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id      text NOT NULL,
  item_type    text NOT NULL CHECK (item_type IN ('task', 'ka')),
  reviewed     boolean NOT NULL DEFAULT true,
  reviewed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- Study-plan checklist state
CREATE TABLE cbap_plan_progress (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key   text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  done_at    timestamptz,
  PRIMARY KEY (user_id, task_key)
);

-- Indexes
CREATE INDEX idx_cbap_flashcard_state_due ON cbap_flashcard_state(user_id, due_date);
CREATE INDEX idx_cbap_quiz_attempts_user ON cbap_quiz_attempts(user_id, created_at);

-- Enable RLS
ALTER TABLE cbap_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbap_flashcard_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbap_quiz_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbap_item_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbap_plan_progress   ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (read + write your own rows)
CREATE POLICY cbap_settings_owner        ON cbap_settings        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY cbap_flashcard_state_owner ON cbap_flashcard_state FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY cbap_quiz_attempts_owner   ON cbap_quiz_attempts   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY cbap_item_progress_owner   ON cbap_item_progress   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY cbap_plan_progress_owner   ON cbap_plan_progress   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
