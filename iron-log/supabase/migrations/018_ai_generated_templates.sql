-- Felippe's Log — AI-generated ephemeral templates.
--
-- The AI workout generator materialises its recommendation as a regular
-- workout_templates row so it can reuse the whole session flow
-- (progression, briefing, finishing, etc.) without a parallel code path.
--
-- The flag hides these rows from the human-facing template lists in
-- /treinar and /templates. They're still fully valid templates in the DB.

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS ai_rationale TEXT;

-- Index so the "exclude AI templates" queries stay cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_workout_templates_ai
  ON workout_templates (user_id, is_ai_generated);
