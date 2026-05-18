-- Phase 6: video lessons + playback progress.
-- Lessons can now carry a video_url. Player progress is reported by the
-- SPA into lesson_progress.watch_pct so a learner is automatically marked
-- complete at 90% playback. Existing text lessons are unaffected.

ALTER TABLE lesson
    ADD COLUMN video_url TEXT,
    ADD COLUMN video_provider VARCHAR(32);

ALTER TABLE lesson_progress
    ADD COLUMN watch_pct INT NOT NULL DEFAULT 0;
