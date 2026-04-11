-- Felippe's Log — Rest day marking.
--
-- On rest days the user can't realistically complete the strength leg of
-- the daily-completion grid. Marking a day as rest lowers the max from
-- 4 to 3 (weight + cardio + steps), so 3/3 still triggers the Beast Mode
-- crimson glow on the heatmap.

CREATE TABLE IF NOT EXISTS rest_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  rest_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rest_days_user_date_unique
  ON rest_days(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), rest_date);

ALTER TABLE rest_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rest days" ON rest_days
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
