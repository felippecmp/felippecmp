-- Felippe's Log — all-in-one bootstrap script.
--
-- Copy this whole file into Supabase SQL Editor (New Query → paste → Run).
-- It's idempotent for tables (CREATE IF NOT EXISTS) but NOT for policies
-- or seed data — running it twice will error. For the first setup of a
-- fresh Supabase project, run it once and you're done.
--
-- If you prefer to run the three original migrations separately, they
-- live in 001_init.sql, 002_seed_exercises.sql and 003_user_settings.sql.

-- =====================================================================
-- 001 — Core schema: tables, indexes, view, RLS
-- =====================================================================

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

CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_progression_state_user_exercise ON progression_state(user_id, exercise_id);

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

-- =====================================================================
-- 002 — Seed exercises
-- =====================================================================

INSERT INTO exercises (name, movement_pattern, session_type, equipment, primary_muscle, secondary_muscles, load_increment) VALUES
('Supino Reto com Barra', 'horizontal_push', 'upper', 'barbell', 'chest', ARRAY['triceps','front_delts'], 2.5),
('Supino Inclinado com Halteres', 'horizontal_push', 'upper', 'dumbbell', 'chest', ARRAY['triceps','front_delts'], 2.0),
('Remada Curvada com Barra', 'horizontal_pull', 'upper', 'barbell', 'lats', ARRAY['biceps','rear_delts','traps'], 2.5),
('Remada Cavalinho (T-Bar)', 'horizontal_pull', 'upper', 'machine', 'lats', ARRAY['biceps','traps'], 2.5),
('Desenvolvimento Militar com Barra', 'vertical_push', 'upper', 'barbell', 'front_delts', ARRAY['triceps','traps'], 2.5),
('Desenvolvimento com Halteres', 'vertical_push', 'upper', 'dumbbell', 'front_delts', ARRAY['triceps'], 2.0),
('Puxada Pronada', 'vertical_pull', 'upper', 'cable', 'lats', ARRAY['biceps','traps'], 2.5),
('Puxada Neutra', 'vertical_pull', 'upper', 'cable', 'lats', ARRAY['biceps'], 2.5),
('Rosca Direta com Barra', 'biceps_isolation', 'upper', 'barbell', 'biceps', ARRAY[]::TEXT[], 1.25),
('Rosca Scott com Haltere', 'biceps_isolation', 'upper', 'dumbbell', 'biceps', ARRAY[]::TEXT[], 1.0),
('Tríceps Corda', 'triceps_isolation', 'upper', 'cable', 'triceps', ARRAY[]::TEXT[], 2.5),
('Tríceps Francês com Barra', 'triceps_isolation', 'upper', 'barbell', 'triceps', ARRAY[]::TEXT[], 1.25),
('Elevação Lateral com Halteres', 'side_delt_isolation', 'upper', 'dumbbell', 'side_delts', ARRAY[]::TEXT[], 1.0),
('Elevação Lateral no Cabo', 'side_delt_isolation', 'upper', 'cable', 'side_delts', ARRAY[]::TEXT[], 1.25),
('Agachamento Livre', 'quad_dominant', 'lower', 'barbell', 'quads', ARRAY['glutes','hamstrings'], 2.5),
('Agachamento Hack', 'quad_dominant', 'lower', 'machine', 'quads', ARRAY['glutes'], 5.0),
('Stiff com Barra', 'hip_hinge', 'lower', 'barbell', 'hamstrings', ARRAY['glutes','lower_back'], 2.5),
('Levantamento Terra Romeno', 'hip_hinge', 'lower', 'barbell', 'hamstrings', ARRAY['glutes','lower_back'], 2.5),
('Leg Press', 'quad_accessory', 'lower', 'machine', 'quads', ARRAY['glutes'], 5.0),
('Cadeira Extensora', 'quad_accessory', 'lower', 'machine', 'quads', ARRAY[]::TEXT[], 2.5),
('Mesa Flexora', 'hamstring_isolation', 'lower', 'machine', 'hamstrings', ARRAY[]::TEXT[], 2.5),
('Hip Thrust com Barra', 'glute_isolation', 'lower', 'barbell', 'glutes', ARRAY['hamstrings'], 5.0),
('Panturrilha no Smith', 'calf', 'lower', 'machine', 'calves', ARRAY[]::TEXT[], 2.5),
('Panturrilha Sentado', 'calf', 'lower', 'machine', 'calves', ARRAY[]::TEXT[], 2.5);

-- =====================================================================
-- 003 — User settings
-- =====================================================================

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
