-- Felippe's Log — Machine annotation per template slot + per logged set.
--
-- New gym (CT) has many machines for the same movement. The exercise
-- catalog stays as the abstract movement ("Puxada Vertical") and we
-- annotate WHICH MACHINE was used both at the template-slot level
-- (so the user's plan is "Puxada Vertical on Cimerian") and at the
-- workout_set level (so the historical log preserves which machine
-- was used in case the slot's annotation changes later or the user
-- swaps mid-block).
--
-- Free-text TEXT field: captures brand names like "Cimerian", "Allfit",
-- "Hammer Strength". When the user types a value the app will
-- autocomplete from previously-seen values for that exercise. No
-- separate machines table — keeps the schema flat and tolerant of
-- typos / casing variants without a normalize step.

ALTER TABLE template_exercises
  ADD COLUMN IF NOT EXISTS machine TEXT;

ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS machine TEXT;

-- Indexes on machine for autocomplete queries (DISTINCT machine WHERE
-- exercise_id = X). Partial index since most rows will have NULL until
-- the user starts populating the field.
CREATE INDEX IF NOT EXISTS idx_template_exercises_machine
  ON template_exercises(exercise_id, machine)
  WHERE machine IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sets_machine
  ON workout_sets(exercise_id, machine)
  WHERE machine IS NOT NULL;
