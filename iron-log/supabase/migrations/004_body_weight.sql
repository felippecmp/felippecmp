-- Felippe's Log — Sprint 5d: body weight entries.
--
-- One row per weigh-in. Multiple entries per day are allowed but the UI
-- surfaces only the most recent one per day on the diary.

CREATE TABLE IF NOT EXISTS body_weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_weight_user_date
  ON body_weight_entries(user_id, recorded_at DESC);

ALTER TABLE body_weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own body weight" ON body_weight_entries
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
