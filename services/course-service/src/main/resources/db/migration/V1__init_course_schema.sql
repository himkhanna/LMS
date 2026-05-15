CREATE TABLE course (
    id           UUID PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    status       VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE course_module (
    id           UUID PRIMARY KEY,
    course_id    UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    position     INT          NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (course_id, position)
);

CREATE TABLE lesson (
    id            UUID PRIMARY KEY,
    module_id     UUID NOT NULL REFERENCES course_module(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    content       TEXT,
    position      INT          NOT NULL,
    duration_secs INT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (module_id, position)
);

CREATE INDEX idx_module_course ON course_module(course_id);
CREATE INDEX idx_lesson_module ON lesson(module_id);
