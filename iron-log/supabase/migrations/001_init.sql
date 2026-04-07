-- Iron Log — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste → Run)

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  movement_pattern TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('upper', 'lower')),
  equipment TEXT,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  load_increment NUMERIC(4,2) DEFAULT 2.5,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('upper', 'lower')),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workout_templates ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises,
  slot_order INT NOT NULL,
  target_sets INT DEFAULT 2,
  rep_range_low INT DEFAULT 4,
  rep_range_high INT DEFAULT 8,
  rest_seconds INT DEFAULT 180,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  template_id UUID REFERENCES workout_templates,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_minutes INT,
  notes TEXT,
  overall_feeling INT CHECK (overall_feeling BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises,
  set_number INT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  rir INT CHECK (rir BETWEEN 0 AND 4),
  is_warmup BOOLEAN DEFAULT false,
  notes TEXT,
  performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS progression_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  exercise_id UUID REFERENCES exercises,
  current_weight_kg NUMERIC(6,2),
  current_status TEXT DEFAULT 'building'
    CHECK (current_status IN ('building','ready_to_progress','just_progressed','stalled')),
  sessions_at_current_weight INT DEFAULT 0,
  last_top_set_reps INT,
  last_session_date DATE,
  streak_at_top_range INT DEFAULT 0,
  stall_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_progression_state_user_exercise ON progression_state(user_id, exercise_id);

-- ============================================================
-- VIEW: rolling 7-day volume per muscle
-- ============================================================

CREATE OR REPLACE VIEW rolling_7day_volume AS
SELECT
  ws.user_id,
  e.primary_muscle,
  COUNT(wset.id) FILTER (WHERE NOT wset.is_warmup) AS total_sets,
  AVG(wset.weight_kg) AS avg_weight,
  AVG(wset.reps) AS avg_reps,
  AVG(wset.rir) AS avg_rir
FROM workout_sets wset
JOIN workout_sessions ws ON wset.session_id = ws.id
JOIN exercises e ON wset.exercise_id = e.id
WHERE NOT wset.is_warmup
  AND wset.performed_at >= NOW() - INTERVAL '7 days'
GROUP BY ws.user_id, e.primary_muscle;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own exercises" ON exercises
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "own templates" ON workout_templates
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "own template exercises" ON template_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_templates t
      WHERE t.id = template_exercises.template_id
        AND (t.user_id = auth.uid() OR t.user_id IS NULL)
    )
  );

CREATE POLICY "own sessions" ON workout_sessions
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "own sets" ON workout_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions s
      WHERE s.id = workout_sets.session_id
        AND (s.user_id = auth.uid() OR s.user_id IS NULL)
    )
  );

CREATE POLICY "own progression" ON progression_state
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
