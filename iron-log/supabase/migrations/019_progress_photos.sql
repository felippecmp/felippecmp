-- Felippe's Log — Progress photos.
--
-- Table: progress_photos
--   One row per photo. storage_path points into the "progress-photos"
--   bucket. Weight is optional (auto-prefilled from body_weight_entries
--   of the same day on the client). crop_top / crop_bottom are floats
--   0..1 describing the visible vertical window — the original photo
--   stays intact in storage so the user can re-crop later without
--   losing quality.
--
-- Bucket: progress-photos (private)
--   All reads/writes go through the Next.js server using the service
--   role key. The client never talks to Storage directly, so the
--   signed URLs that reach the browser expire in 1h and can't be
--   re-harvested by a leaked link.

CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  storage_path TEXT NOT NULL,
  weight_kg NUMERIC(5,2),
  note TEXT,
  crop_top REAL NOT NULL DEFAULT 0 CHECK (crop_top >= 0 AND crop_top <= 1),
  crop_bottom REAL NOT NULL DEFAULT 1 CHECK (crop_bottom >= 0 AND crop_bottom <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (crop_bottom > crop_top)
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date
  ON progress_photos(user_id, photo_date DESC);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own progress photos" ON progress_photos
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Auto-update updated_at on any write so edits to crop_top / crop_bottom
-- / weight / note propagate for cache invalidation on the client.
CREATE OR REPLACE FUNCTION touch_progress_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS progress_photos_touch_updated_at ON progress_photos;
CREATE TRIGGER progress_photos_touch_updated_at
  BEFORE UPDATE ON progress_photos
  FOR EACH ROW EXECUTE FUNCTION touch_progress_photos_updated_at();

-- Storage bucket — private, no public access. The service role bypasses
-- RLS for writes; the browser only ever receives 1h signed URLs the
-- server generates on its behalf.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  FALSE,
  5 * 1024 * 1024, -- 5MB hard cap (client resizes to ~200KB before upload)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- No storage.objects policies needed — private bucket + service role on
-- the server bypasses RLS. Any direct client access with the anon key
-- will be denied by default, which is what we want.
