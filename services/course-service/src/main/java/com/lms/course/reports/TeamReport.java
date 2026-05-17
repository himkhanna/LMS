package com.lms.course.reports;

import java.util.List;

public record TeamReport(
        String managerEmail,
        long totalReports,
        long activeEnrollments,
        long completedEnrollments,
        long overdueEnrollments,
        List<DirectReport> directReports
) {
    public record DirectReport(
            java.util.UUID userId,
            String userEmail,
            String userName,
            String department,
            long totalEnrollments,
            long activeEnrollments,
            long completedEnrollments,
            long overdueEnrollments,
            int avgProgressPct
    ) {}
}
