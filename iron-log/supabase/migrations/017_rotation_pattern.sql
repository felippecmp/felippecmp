-- Felippe's Log — Custom rotation pattern.
--
-- An ordered array of slots, each either a template reference or a rest day.
-- Example: [{"t":"upper-a-id"},{"t":"lower-a-id"},{"t":"rest"},...]
-- When null, the rotation is auto-derived from template sort_order.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS rotation_pattern JSONB;
