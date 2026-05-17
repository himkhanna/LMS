-- Phase 2: quizzes, questions, attempts, attempt answers.
-- Quizzes attach to a course (always) and optionally to a module or lesson,
-- to support both per-lesson knowledge checks and end-of-module/course
-- assessments.

CREATE TABLE quiz (
    id                UUID PRIMARY KEY,
    course_id         UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    module_id         UUID REFERENCES course_module(id) ON DELETE SET NULL,
    lesson_id         UUID REFERENCES lesson(id) ON DELETE SET NULL,
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    pass_score        INT NOT NULL DEFAULT 70,
    time_limit_mins   INT,
    max_attempts      INT,
    shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
    status            VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    position          INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_course ON quiz(course_id);
CREATE INDEX idx_quiz_module ON quiz(module_id) WHERE module_id IS NOT NULL;
CREATE INDEX idx_quiz_lesson ON quiz(lesson_id) WHERE lesson_id IS NOT NULL;

-- question.type:  MCQ_SINGLE | MCQ_MULTI | TRUE_FALSE | SHORT_ANSWER
-- question.options shape per type:
--   MCQ_*       : ["choice 1", "choice 2", ...]
--   TRUE_FALSE  : null  (always 2 options: True / False)
--   SHORT_ANSWER: null
-- question.correct shape per type:
--   MCQ_SINGLE  : [0]               (single index)
--   MCQ_MULTI   : [0, 2]            (set of indices, order-insensitive)
--   TRUE_FALSE  : [true] or [false] (single boolean as one-element JSON array)
--   SHORT_ANSWER: ["paris", "Paris, France"]  (any case-insensitive match passes)
CREATE TABLE question (
    id          UUID PRIMARY KEY,
    quiz_id     UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    type        VARCHAR(32) NOT NULL,
    prompt      TEXT NOT NULL,
    options     JSONB,
    correct     JSONB NOT NULL,
    points      INT  NOT NULL DEFAULT 1,
    explanation TEXT,
    position    INT  NOT NULL,
    CONSTRAINT uk_question_quiz_position UNIQUE (quiz_id, position)
);
CREATE INDEX idx_question_quiz ON question(quiz_id);

CREATE TABLE attempt (
    id            UUID PRIMARY KEY,
    quiz_id       UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL,
    user_email    VARCHAR(255),
    user_name     VARCHAR(255),
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at  TIMESTAMPTZ,
    score         INT,
    max_score     INT,
    score_pct     INT,
    passed        BOOLEAN
);
CREATE INDEX idx_attempt_user ON attempt(user_id, started_at DESC);
CREATE INDEX idx_attempt_quiz ON attempt(quiz_id);

CREATE TABLE attempt_answer (
    id              UUID PRIMARY KEY,
    attempt_id      UUID NOT NULL REFERENCES attempt(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    response        JSONB NOT NULL,
    points_awarded  INT NOT NULL DEFAULT 0,
    correct         BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_attempt_answer_question UNIQUE (attempt_id, question_id)
);
