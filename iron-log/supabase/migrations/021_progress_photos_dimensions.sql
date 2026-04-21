-- Felippe's Log — Progress photos: original image dimensions.
--
-- Without knowing the aspect ratio of the stored image, the thumbnail
-- and compare renderers can't scale uniformly and the image ends up
-- stretched whenever the crop window doesn't match the 3:4 tile aspect.
-- Persisting orig_width / orig_height lets the client compute the
-- correct CSS transform (single scale factor, no squash).

ALTER TABLE progress_photos
  ADD COLUMN IF NOT EXISTS orig_width  INT,
  ADD COLUMN IF NOT EXISTS orig_height INT;
