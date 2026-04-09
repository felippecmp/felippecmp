-- Felippe's Log — Sprint 5e: strength session device aggregates.
--
-- Columns to hold the summary data parsed from a Coros/Garmin FIT file
-- attached to a finished strength session. We only store aggregates here
-- (not the raw HR sample series) because the useful signal for strength is
-- "what was my avg/max HR and duration" — the seconds-level timeline would
-- be a separate future enhancement.

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS avg_heart_rate INT,
  ADD COLUMN IF NOT EXISTS max_heart_rate INT,
  ADD COLUMN IF NOT EXISTS device_calories INT,
  ADD COLUMN IF NOT EXISTS device_duration_seconds INT,
  ADD COLUMN IF NOT EXISTS device_source TEXT;
