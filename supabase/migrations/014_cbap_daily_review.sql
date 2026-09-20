-- CBAP daily review: per-question spaced repetition + daily streak log.
-- Additive on top of 013_cbap_schema.sql; adds nothing the estate app touches.
--
-- IF NOT EXISTS guards are deliberate: an earlier draft of this migration was
-- circulated as 008_cbap_schema.sql, so these objects may already exist.

-- ─── Settings: a question goal, alongside the existing flashcard goal ───
-- daily_card_goal governs the flashcard queue; this governs the daily question
-- review. They are separate queues with separate sensible defaults.
ALTER TABLE cbap_settings
  ADD COLUMN IF NOT EXISTS daily_question_goal integer NOT NULL DEFAULT 15;

ALTER TABLE cbap_settings DROP CONSTRAINT IF EXISTS cbap_settings_daily_question_goal_check;
ALTER TABLE cbap_settings ADD CONSTRAINT cbap_settings_daily_question_goal_check
  CHECK (daily_question_goal BETWEEN 5 AND 60);

-- ─── Quiz attempts: allow the 'daily' mode ───
-- 013 constrained mode to ('practice','mock'); daily reviews log under 'daily'.
ALTER TABLE cbap_quiz_attempts DROP CONSTRAINT IF EXISTS cbap_quiz_attempts_mode_check;
ALTER TABLE cbap_quiz_attempts ADD CONSTRAINT cbap_quiz_attempts_mode_check
  CHECK (mode IN ('practice', 'mock', 'daily'));

-- ─── Per-question SM-2 state ───
-- One row per question the user has answered at least once. Mirrors
-- cbap_flashcard_state, but keyed to question ids from lib/cbap/content/questions.
CREATE TABLE IF NOT EXISTS cbap_question_state (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id      text NOT NULL,
  ease             numeric NOT NULL DEFAULT 2.5,
  interval_days    integer NOT NULL DEFAULT 0,
  repetitions      integer NOT NULL DEFAULT 0,
  due_date         date NOT NULL DEFAULT (now()::date),
  times_seen       integer NOT NULL DEFAULT 0,
  times_correct    integer NOT NULL DEFAULT 0,
  last_answered_at timestamptz,
  PRIMARY KEY (user_id, question_id)
);

-- ─── Daily review log ───
-- One row per user per calendar day. answered_ids makes answer recording
-- idempotent within a day and lets a part-finished session resume on any device.
CREATE TABLE IF NOT EXISTS cbap_daily_log (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_date  date NOT NULL,
  target       integer NOT NULL DEFAULT 15,
  answered     integer NOT NULL DEFAULT 0,
  correct      integer NOT NULL DEFAULT 0,
  answered_ids text[] NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  PRIMARY KEY (user_id, review_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbap_question_state_due ON cbap_question_state(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_cbap_daily_log_date     ON cbap_daily_log(user_id, review_date DESC);

-- Enable RLS
ALTER TABLE cbap_question_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbap_daily_log      ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (read + write your own rows)
DROP POLICY IF EXISTS cbap_question_state_owner ON cbap_question_state;
DROP POLICY IF EXISTS cbap_daily_log_owner      ON cbap_daily_log;

CREATE POLICY cbap_question_state_owner ON cbap_question_state FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY cbap_daily_log_owner      ON cbap_daily_log      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
