-- Felippe's Log — PPL 2x split seed.
--
-- Replaces the legacy Upper/Lower rotation with a 6-template
-- Push/Pull/Legs 2x split pulled from standard literature defaults
-- (compounds first, isolation tail). Existing templates are archived
-- (is_active=false) instead of deleted so the historical sessions
-- linked to them keep rendering correctly.
--
-- Design notes:
-- - workout_templates.session_type still has the upper/lower CHECK
--   constraint. Keeping it is a no-op for naming (Push A is still
--   "Push A" via name) and avoids breaking AdhocExercisePicker which
--   filters its exercise list by upper/lower. Push/Pull templates
--   map to 'upper' so they pick from the upper-body catalog; Legs
--   maps to 'lower'.
-- - Auto-rotation (alternating upper↔lower) won't pick correctly
--   between Push and Pull (both 'upper'). Migration flips
--   rotation_mode to 'linear' so the order respects sort_order.
-- - Exercises are matched by name against the seeded catalog
--   (migration 002). If the user renamed any, the corresponding slot
--   just won't insert — they can add it manually via the editor.
-- - target_sets / rep_range / rest_seconds picked from common
--   hypertrophy guidance: compounds 3x6-8 / 180s, isolation 3x10-12
--   / 90-120s.
-- - machine column is left NULL — user fills as they discover what
--   each exercise lives on at the new gym (CT).

BEGIN;

-- 1) Archive existing active templates.
UPDATE workout_templates
SET is_active = false
WHERE is_active = true;

-- 2) Force linear rotation so the new sort_order is respected.
INSERT INTO user_settings (rotation_mode)
SELECT 'linear'
WHERE NOT EXISTS (SELECT 1 FROM user_settings);

UPDATE user_settings SET rotation_mode = 'linear';

-- 3) Create the 6 PPL templates and populate slots in one go.
-- Each block: insert template, then insert its slots joining on
-- exercise name. Slots that don't match a known exercise are silently
-- skipped (INNER JOIN).
DO $$
DECLARE
  push_a_id uuid;
  pull_a_id uuid;
  legs_a_id uuid;
  push_b_id uuid;
  pull_b_id uuid;
  legs_b_id uuid;
BEGIN
  -- Push A: chest-leaning push day
  INSERT INTO workout_templates (name, session_type, sort_order, is_active)
  VALUES ('Push A', 'upper', 0, true)
  RETURNING id INTO push_a_id;
  INSERT INTO template_exercises (template_id, exercise_id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, machine)
  SELECT push_a_id, e.id, d.slot_order, d.sets, d.reps_low, d.reps_high, d.rest, NULL
  FROM exercises e
  JOIN (VALUES
    ('Supino Reto com Barra',           0, 3, 6,  8, 180),
    ('Desenvolvimento Militar com Barra', 1, 3, 6,  8, 180),
    ('Supino Inclinado com Halteres',   2, 3, 8, 10, 150),
    ('Elevação Lateral com Halteres',   3, 4, 12, 15, 90),
    ('Tríceps Corda',                   4, 3, 10, 12, 90)
  ) AS d(name, slot_order, sets, reps_low, reps_high, rest)
    ON e.name = d.name;

  -- Pull A: back-thickness leaning pull day
  INSERT INTO workout_templates (name, session_type, sort_order, is_active)
  VALUES ('Pull A', 'upper', 1, true)
  RETURNING id INTO pull_a_id;
  INSERT INTO template_exercises (template_id, exercise_id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, machine)
  SELECT pull_a_id, e.id, d.slot_order, d.sets, d.reps_low, d.reps_high, d.rest, NULL
  FROM exercises e
  JOIN (VALUES
    ('Remada Curvada com Barra',  0, 3, 6,  8, 180),
    ('Puxada Pronada',            1, 3, 8, 10, 150),
    ('Remada Cavalinho (T-Bar)',  2, 3, 8, 10, 150),
    ('Rosca Direta com Barra',    3, 3, 8, 10, 90),
    ('Rosca Scott com Haltere',   4, 3, 10, 12, 90)
  ) AS d(name, slot_order, sets, reps_low, reps_high, rest)
    ON e.name = d.name;

  -- Legs A: quad-dominant lower day
  INSERT INTO workout_templates (name, session_type, sort_order, is_active)
  VALUES ('Legs A', 'lower', 2, true)
  RETURNING id INTO legs_a_id;
  INSERT INTO template_exercises (template_id, exercise_id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, machine)
  SELECT legs_a_id, e.id, d.slot_order, d.sets, d.reps_low, d.reps_high, d.rest, NULL
  FROM exercises e
  JOIN (VALUES
    ('Agachamento Livre',         0, 4, 5,  8, 240),
    ('Leg Press',                 1, 3, 8, 12, 180),
    ('Cadeira Extensora',         2, 3, 12, 15, 90),
    ('Mesa Flexora',              3, 3, 10, 12, 90),
    ('Panturrilha no Smith',      4, 4, 10, 12, 90)
  ) AS d(name, slot_order, sets, reps_low, reps_high, rest)
    ON e.name = d.name;

  -- Push B: shoulders/triceps leaning push day
  INSERT INTO workout_templates (name, session_type, sort_order, is_active)
  VALUES ('Push B', 'upper', 3, true)
  RETURNING id INTO push_b_id;
  INSERT INTO template_exercises (template_id, exercise_id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, machine)
  SELECT push_b_id, e.id, d.slot_order, d.sets, d.reps_low, d.reps_high, d.rest, NULL
  FROM exercises e
  JOIN (VALUES
    ('Desenvolvimento com Halteres',  0, 3, 6,  8, 180),
    ('Supino Inclinado com Halteres', 1, 3, 8, 10, 150),
    ('Elevação Lateral no Cabo',      2, 4, 12, 15, 90),
    ('Tríceps Francês com Barra',     3, 3, 10, 12, 90),
    ('Supino Reto com Barra',         4, 2, 8, 10, 150)
  ) AS d(name, slot_order, sets, reps_low, reps_high, rest)
    ON e.name = d.name;

  -- Pull B: lat-width leaning pull day
  INSERT INTO workout_templates (name, session_type, sort_order, is_active)
  VALUES ('Pull B', 'upper', 4, true)
  RETURNING id INTO pull_b_id;
  INSERT INTO template_exercises (template_id, exercise_id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, machine)
  SELECT pull_b_id, e.id, d.slot_order, d.sets, d.reps_low, d.reps_high, d.rest, NULL
  FROM exercises e
  JOIN (VALUES
    ('Puxada Neutra',             0, 3, 6,  8, 180),
    ('Remada Curvada com Barra',  1, 3, 8, 10, 150),
    ('Puxada Pronada',            2, 3, 10, 12, 120),
    ('Rosca Scott com Haltere',   3, 3, 8, 10, 90),
    ('Rosca Direta com Barra',    4, 2, 10, 12, 90)
  ) AS d(name, slot_order, sets, reps_low, reps_high, rest)
    ON e.name = d.name;

  -- Legs B: hip-hinge / posterior-chain leaning lower day
  INSERT INTO workout_templates (name, session_type, sort_order, is_active)
  VALUES ('Legs B', 'lower', 5, true)
  RETURNING id INTO legs_b_id;
  INSERT INTO template_exercises (template_id, exercise_id, slot_order, target_sets, rep_range_low, rep_range_high, rest_seconds, machine)
  SELECT legs_b_id, e.id, d.slot_order, d.sets, d.reps_low, d.reps_high, d.rest, NULL
  FROM exercises e
  JOIN (VALUES
    ('Levantamento Terra Romeno', 0, 3, 5,  8, 240),
    ('Hip Thrust com Barra',      1, 3, 8, 10, 180),
    ('Agachamento Hack',          2, 3, 8, 12, 180),
    ('Mesa Flexora',              3, 3, 10, 12, 90),
    ('Panturrilha Sentado',       4, 4, 12, 15, 90)
  ) AS d(name, slot_order, sets, reps_low, reps_high, rest)
    ON e.name = d.name;
END $$;

COMMIT;
