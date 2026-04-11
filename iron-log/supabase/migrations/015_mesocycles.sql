-- Felippe's Log — Periodization: mesocycles + per-week targets.
--
-- A mesocycle is a named training block (4-12 weeks) made of an ordered
-- sequence of phases (accumulation → intensification → realization → deload).
-- Sessions don't have a foreign key into a mesocycle — instead, sessions are
-- associated with a block via date range, so existing sessions stay untouched
-- and the user can create/delete blocks freely.
--
-- mesocycle_weeks holds the per-week plan: which phase, what volume targets
-- (overrides the global user_settings.volume_targets when set), what
-- intensity target (RIR-based), and a free-form reasoning string for when
-- Sprint I onwards lets Claude write here.

CREATE TABLE IF NOT EXISTS mesocycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL CHECK (length(name) > 0),
  starts_on DATE NOT NULL,
  ends_on DATE,
  total_weeks INT NOT NULL CHECK (total_weeks BETWEEN 3 AND 16),
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'coach')),
  user_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mesocycles_user_dates
  ON mesocycles(user_id, starts_on DESC);

CREATE TABLE IF NOT EXISTS mesocycle_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES mesocycles(id) ON DELETE CASCADE,
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 16),
  week_starts_on DATE NOT NULL,
  phase TEXT NOT NULL CHECK (
    phase IN ('accumulation', 'intensification', 'realization', 'deload')
  ),
  volume_targets JSONB,
  intensity_target TEXT,
  coach_reasoning TEXT,
  user_overrode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mesocycle_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_mesocycle_weeks_dates
  ON mesocycle_weeks(week_starts_on DESC);

ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesocycle_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mesocycles" ON mesocycles
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "own mesocycle weeks" ON mesocycle_weeks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = mesocycle_weeks.mesocycle_id
        AND (auth.uid() = mesocycles.user_id OR mesocycles.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesocycles
      WHERE mesocycles.id = mesocycle_weeks.mesocycle_id
        AND (auth.uid() = mesocycles.user_id OR mesocycles.user_id IS NULL)
    )
  );
