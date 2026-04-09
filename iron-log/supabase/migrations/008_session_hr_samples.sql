-- Felippe's Log — Sprint 5h: raw heart rate sample series per session.
--
-- heart_rate_samples is a compact JSONB array of {t, hr} where t is the
-- offset in seconds from device_start_time. This lets us render a curve
-- over the session's actual timeline and overlay markers at the wall-clock
-- timestamps of each workout_sets row. Downsampled at parse time (~1 sample
-- every 5 seconds) to keep the JSONB blob small.

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS heart_rate_samples JSONB,
  ADD COLUMN IF NOT EXISTS device_start_time TIMESTAMPTZ;
