-- Phase 6: per-lesson voiceover script.
-- HR can type narration text per lesson; the SPA reads it aloud via the
-- browser's built-in SpeechSynthesis API. For PPT slideshow imports the
-- field is auto-populated from any speaker notes the deck included.

ALTER TABLE lesson
    ADD COLUMN voice_over_text TEXT;
