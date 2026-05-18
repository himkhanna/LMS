package com.lms.course.enrollment;

import java.time.OffsetDateTime;
import java.util.UUID;

public record LessonProgressDto(
        UUID id,
        UUID userId,
        UUID lessonId,
        UUID courseId,
        LessonProgressStatus status,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        int watchPct
) {
    public static LessonProgressDto from(LessonProgress p) {
        return new LessonProgressDto(
                p.getId(), p.getUserId(), p.getLessonId(), p.getCourseId(),
                p.getStatus(), p.getStartedAt(), p.getCompletedAt(),
                p.getWatchPct());
    }
}
