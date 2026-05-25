-- Phase 6: catalog card images.
-- HR can upload a cover image (jpg / png / webp) on a course; the catalog
-- card renders the image with the cover_color used as a fallback when no
-- image is set or while the image is loading.

ALTER TABLE course
    ADD COLUMN cover_image_url TEXT;
