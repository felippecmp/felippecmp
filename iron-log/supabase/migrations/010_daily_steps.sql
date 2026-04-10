-- Felippe's Log — Daily step count tracking.
--
-- One row per day. The user logs their total steps for a given date
-- (usually yesterday's close or today's current). Also extracted from
-- FIT walking/running files via total_cycles.

CREATE TABLE IF NOT EXISTS daily_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  step_date DATE NOT NULL,
  steps INT NOT NULL CHECK (steps >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_steps_user_date
  ON daily_steps(user_id, step_date DESC);

ALTER TABLE daily_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own steps" ON daily_steps
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Per-activity step count extracted from FIT files (total_cycles for walking/running).
ALTER TABLE cardio_sessions ADD COLUMN IF NOT EXISTS steps INT;
