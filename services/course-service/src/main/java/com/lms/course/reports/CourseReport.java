package com.lms.course.reports;

import java.util.UUID;

/** Aggregated stats for a single course, used on the HR reports dashboard. */
public record CourseReport(
        UUID courseId,
        String courseTitle,
        String status,
        long totalEnrolled,
        long assigned,
        long inProgress,
        long completed,
        long waived,
        long overdue,
        long mandatoryEnrolled,
        long mandatoryCompleted,
        double avgProgressPct,
        Double avgQuizScorePct,
        long totalQuizAttempts,
        long passedQuizAttempts
) {}
