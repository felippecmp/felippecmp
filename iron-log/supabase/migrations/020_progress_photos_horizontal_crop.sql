-- Felippe's Log — Progress photos: horizontal crop.
--
-- Adds crop_left / crop_right (floats 0..1) alongside the existing
-- crop_top / crop_bottom so the editor can tighten the frame on all
-- four sides. This matters for before/after comparison: aligning the
-- shoulders and hips consistently across photos is what makes the
-- visual delta actually readable.
--
-- Defaults are 0 / 1 so every existing row stays full-width and no
-- rendering changes on old thumbnails.

ALTER TABLE progress_photos
  ADD COLUMN IF NOT EXISTS crop_left  REAL NOT NULL DEFAULT 0
    CHECK (crop_left >= 0 AND crop_left <= 1),
  ADD COLUMN IF NOT EXISTS crop_right REAL NOT NULL DEFAULT 1
    CHECK (crop_right >= 0 AND crop_right <= 1);

-- Row-level sanity: window must be non-empty on both axes.
ALTER TABLE progress_photos
  DROP CONSTRAINT IF EXISTS progress_photos_crop_horizontal_nonempty;
ALTER TABLE progress_photos
  ADD CONSTRAINT progress_photos_crop_horizontal_nonempty
  CHECK (crop_right > crop_left);
