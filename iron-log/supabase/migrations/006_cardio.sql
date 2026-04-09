-- Felippe's Log — Sprint 5f: cardio / walk sessions.
--
-- Separate entity from workout_sessions because cardio has no sets, no
-- template, no progression state — just time / distance / HR / calories.
-- Sources are manual entry OR a Coros FIT upload.

CREATE TABLE IF NOT EXISTS cardio_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  activity_type TEXT NOT NULL DEFAULT 'walking'
    CHECK (activity_type IN ('walking', 'running', 'cycling', 'other')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
  distance_km NUMERIC(6,2),
  avg_heart_rate INT,
  max_heart_rate INT,
  calories INT,
  device_source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_user_date
  ON cardio_sessions(user_id, started_at DESC);

ALTER TABLE cardio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own cardio" ON cardio_sessions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
