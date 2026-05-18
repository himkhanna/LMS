package com.lms.course.path;

import com.lms.course.enrollment.EnrollmentStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record LearningPathAssignmentDto(
        UUID id,
        UUID pathId,
        String pathTitle,
        String pathCoverColor,
        UUID userId,
        String userEmail,
        String userName,
        EnrollmentStatus status,
        boolean mandatory,
        OffsetDateTime assignedAt,
        OffsetDateTime dueAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        int progressPct,
        boolean overdue
) {
    public static LearningPathAssignmentDto from(LearningPathAssignment a) {
        OffsetDateTime now = OffsetDateTime.now();
        boolean overdue = a.getDueAt() != null
                && a.getStatus() != EnrollmentStatus.COMPLETED
                && a.getStatus() != EnrollmentStatus.WAIVED
                && a.getDueAt().isBefore(now);
        return new LearningPathAssignmentDto(
                a.getId(),
                a.getPath().getId(),
                a.getPath().getTitle(),
                a.getPath().getCoverColor(),
                a.getUserId(),
                a.getUserEmail(),
                a.getUserName(),
                a.getStatus(),
                a.isMandatory(),
                a.getAssignedAt(),
                a.getDueAt(),
                a.getStartedAt(),
                a.getCompletedAt(),
                a.getProgressPct(),
                overdue);
    }
}
