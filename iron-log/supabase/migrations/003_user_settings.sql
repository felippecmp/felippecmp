-- Iron Log — User settings (sprint 5)
-- Single-row-per-user preferences that feed form defaults and UI toggles.
-- In single-user mode (user_id IS NULL), there's a single global row.

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  default_target_sets INT NOT NULL DEFAULT 2
    CHECK (default_target_sets BETWEEN 1 AND 10),
  default_rep_range_low INT NOT NULL DEFAULT 4
    CHECK (default_rep_range_low BETWEEN 1 AND 30),
  default_rep_range_high INT NOT NULL DEFAULT 8
    CHECK (default_rep_range_high BETWEEN 1 AND 30),
  default_rest_seconds INT NOT NULL DEFAULT 180
    CHECK (default_rest_seconds BETWEEN 0 AND 900),
  default_load_increment NUMERIC(4,2) NOT NULL DEFAULT 2.5
    CHECK (default_load_increment > 0),
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
