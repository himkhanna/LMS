package com.lms.course.enrollment;

import jakarta.validation.constraints.NotEmpty;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AssignRequest(
        @NotEmpty List<Learner> learners,
        OffsetDateTime dueAt,
        Boolean mandatory
) {
    public record Learner(UUID userId, String email, String displayName) {}
}
