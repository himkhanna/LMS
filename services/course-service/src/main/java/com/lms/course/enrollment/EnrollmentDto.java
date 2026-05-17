package com.lms.course.enrollment;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EnrollmentDto(
        UUID id,
        UUID courseId,
        String courseTitle,
        UUID userId,
        String userEmail,
        String userName,
        String managerEmail,
        String department,
        EnrollmentStatus status,
        boolean mandatory,
        String assignedByEmail,
        OffsetDateTime assignedAt,
        OffsetDateTime dueAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        int progressPct,
        boolean overdue
) {
    public static EnrollmentDto from(Enrollment e) {
        OffsetDateTime now = OffsetDateTime.now();
        boolean overdue = e.getDueAt() != null
                && e.getStatus() != EnrollmentStatus.COMPLETED
                && e.getStatus() != EnrollmentStatus.WAIVED
                && e.getDueAt().isBefore(now);
        return new EnrollmentDto(
                e.getId(),
                e.getCourse().getId(),
                e.getCourse().getTitle(),
                e.getUserId(),
                e.getUserEmail(),
                e.getUserName(),
                e.getManagerEmail(),
                e.getDepartment(),
                e.getStatus(),
                e.isMandatory(),
                e.getAssignedByEmail(),
                e.getAssignedAt(),
                e.getDueAt(),
                e.getStartedAt(),
                e.getCompletedAt(),
                e.getProgressPct(),
                overdue
        );
    }
}
