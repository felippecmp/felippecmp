-- Felippe's Log — Sprint 5g: body weight target.
--
-- Single optional number stored alongside the other user preferences.
-- Null = no target set. Non-null = render a dashed reference line on the
-- body weight chart and a delta chip in /progresso.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5,2)
    CHECK (target_weight_kg IS NULL OR (target_weight_kg > 0 AND target_weight_kg < 500));
