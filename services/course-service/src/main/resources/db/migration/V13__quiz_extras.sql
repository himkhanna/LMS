-- Phase 6: docx quiz import polish.
-- Add 'topic' to question so HR can group analytics (e.g. "Phishing &
-- Social Engineering: 6 questions") and shuffle_options on quiz so
-- option order is randomised independently of question order.

ALTER TABLE question
    ADD COLUMN topic VARCHAR(128);

ALTER TABLE quiz
    ADD COLUMN shuffle_options BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN cooldown_after_fail_mins INT;

CREATE INDEX idx_question_topic ON question(quiz_id, topic);
