-- Felippe's Log — Free-form daily journal entries.
--
-- One short note per day for sleep, mood, soreness, anything that's
-- not strength/cardio/weight/steps. Surfaces in the home diary like a
-- regular entry. Free-form text on purpose: less friction than picking
-- structured fields.

CREATE TABLE IF NOT EXISTS daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  note_date DATE NOT NULL,
  body TEXT NOT NULL CHECK (length(body) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_notes_user_date_unique
  ON daily_notes(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), note_date);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own daily notes" ON daily_notes
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
