-- Felippe's Log — Configurable weekly volume targets per muscle group.
--
-- Up to now, weekly set targets per muscle were hardcoded in src/lib/stats.ts
-- (WEEKLY_VOLUME_TARGET) — fine for the seed values but not for tuning a real
-- block. This stores per-user overrides as a JSONB map { muscle: int }.
--
-- NULL = use the compile-time defaults. A partial map only overrides the
-- listed muscles; anything missing falls back to the default. This keeps the
-- migration backward compatible: existing rows just inherit the old behavior.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS volume_targets JSONB;
