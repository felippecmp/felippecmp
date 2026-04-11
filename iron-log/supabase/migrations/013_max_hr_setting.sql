-- Felippe's Log — Max HR setting for zone analysis.
--
-- Optional. When set, the workout HR chart breaks the session into
-- 5 standard zones (Z1 50-60% / Z2 60-70% / Z3 70-80% / Z4 80-90% /
-- Z5 90-100%) and shows minutes per zone.
--
-- Null = no zones rendered, with a CTA pointing to /settings.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS max_hr INT
    CHECK (max_hr IS NULL OR (max_hr BETWEEN 100 AND 230));
