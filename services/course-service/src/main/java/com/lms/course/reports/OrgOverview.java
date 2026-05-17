package com.lms.course.reports;

/**
 * Top-of-page rollup numbers used on the reports landing dashboard.
 */
public record OrgOverview(
        long totalCourses,
        long publishedCourses,
        long totalEnrollments,
        long activeEnrollments,
        long completedEnrollments,
        long overdueEnrollments,
        long mandatoryOutstanding,
        long totalLearners,
        long totalQuizAttempts,
        long passedQuizAttempts
) {}
