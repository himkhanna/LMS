package com.lms.course.reports;

import com.lms.course.enrollment.EnrollmentDto;
import com.lms.course.quiz.AttemptDto;

import java.util.List;
import java.util.UUID;

public record LearnerReport(
        UUID userId,
        String userEmail,
        String userName,
        long totalEnrollments,
        long completedEnrollments,
        long overdueEnrollments,
        long totalAttempts,
        long passedAttempts,
        Double avgQuizScorePct,
        List<EnrollmentDto> enrollments,
        List<AttemptDto> recentAttempts
) {}
