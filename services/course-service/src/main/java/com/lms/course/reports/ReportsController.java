package com.lms.course.reports;

import com.lms.course.enrollment.EnrollmentDto;
import com.lms.course.enrollment.EnrollmentStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@PreAuthorize("hasAnyRole('ADMIN','HR')")
public class ReportsController {

    private final ReportsService reports;

    public ReportsController(ReportsService reports) {
        this.reports = reports;
    }

    @GetMapping("/overview")
    public OrgOverview overview() {
        return reports.overview();
    }

    @GetMapping("/courses")
    public List<CourseReport> coursesSummary() {
        return reports.courseSummaries();
    }

    @GetMapping("/courses/{id}")
    public CourseReport courseSummary(@PathVariable UUID id) {
        return reports.courseSummary(id);
    }

    @GetMapping("/courses/{id}/roster")
    public List<EnrollmentDto> roster(@PathVariable UUID id,
                                      @RequestParam(required = false) EnrollmentStatus status) {
        return reports.courseRoster(id, status);
    }

    @GetMapping(value = "/courses/{id}/roster.csv", produces = "text/csv")
    public ResponseEntity<String> rosterCsv(@PathVariable UUID id,
                                            @RequestParam(required = false) EnrollmentStatus status) {
        StringBuilder sb = new StringBuilder();
        sb.append("user_email,user_name,status,progress_pct,mandatory,assigned_at,due_at,started_at,completed_at,overdue\n");
        for (EnrollmentDto e : reports.courseRoster(id, status)) {
            sb.append(csv(e.userEmail())).append(',')
                    .append(csv(e.userName())).append(',')
                    .append(e.status()).append(',')
                    .append(e.progressPct()).append(',')
                    .append(e.mandatory()).append(',')
                    .append(iso(e.assignedAt())).append(',')
                    .append(iso(e.dueAt())).append(',')
                    .append(iso(e.startedAt())).append(',')
                    .append(iso(e.completedAt())).append(',')
                    .append(e.overdue())
                    .append('\n');
        }
        return csvResponse("course-" + id + "-roster.csv", sb.toString());
    }

    @GetMapping("/overdue")
    public List<EnrollmentDto> overdue() {
        return reports.overdueAcrossAllCourses();
    }

    @GetMapping(value = "/overdue.csv", produces = "text/csv")
    public ResponseEntity<String> overdueCsv() {
        StringBuilder sb = new StringBuilder();
        sb.append("user_email,user_name,course_title,status,progress_pct,mandatory,due_at,days_overdue\n");
        var now = java.time.OffsetDateTime.now();
        for (EnrollmentDto e : reports.overdueAcrossAllCourses()) {
            long daysOverdue = e.dueAt() == null ? 0
                    : java.time.Duration.between(e.dueAt(), now).toDays();
            sb.append(csv(e.userEmail())).append(',')
                    .append(csv(e.userName())).append(',')
                    .append(csv(e.courseTitle())).append(',')
                    .append(e.status()).append(',')
                    .append(e.progressPct()).append(',')
                    .append(e.mandatory()).append(',')
                    .append(iso(e.dueAt())).append(',')
                    .append(daysOverdue)
                    .append('\n');
        }
        return csvResponse("overdue.csv", sb.toString());
    }

    @GetMapping("/learners/{userId}")
    public LearnerReport learner(@PathVariable UUID userId) {
        return reports.learnerReport(userId);
    }

    private static String csv(String s) {
        if (s == null) return "";
        boolean needsQuote = s.contains(",") || s.contains("\"") || s.contains("\n");
        if (!needsQuote) return s;
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private static String iso(java.time.OffsetDateTime t) {
        return t == null ? "" : t.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    private static ResponseEntity<String> csvResponse(String filename, String body) {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(body);
    }
}
