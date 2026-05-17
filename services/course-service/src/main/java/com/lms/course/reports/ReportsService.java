package com.lms.course.reports;

import com.lms.course.domain.Course;
import com.lms.course.enrollment.Enrollment;
import com.lms.course.enrollment.EnrollmentDto;
import com.lms.course.enrollment.EnrollmentRepository;
import com.lms.course.enrollment.EnrollmentStatus;
import com.lms.course.quiz.Attempt;
import com.lms.course.quiz.AttemptDto;
import com.lms.course.quiz.AttemptRepository;
import com.lms.course.quiz.Quiz;
import com.lms.course.quiz.QuizRepository;
import com.lms.course.quiz.QuizStatus;
import com.lms.course.repository.CourseRepository;
import com.lms.course.service.CourseNotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ReportsService {

    @PersistenceContext
    private EntityManager em;

    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final QuizRepository quizzes;
    private final AttemptRepository attempts;

    public ReportsService(CourseRepository courses,
                          EnrollmentRepository enrollments,
                          QuizRepository quizzes,
                          AttemptRepository attempts) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.quizzes = quizzes;
        this.attempts = attempts;
    }

    public OrgOverview overview() {
        long totalCourses = courses.count();
        long publishedCourses = countCoursesByStatus("PUBLISHED");
        long totalEnrollments = enrollments.count();
        long activeEnrollments = countEnrollmentsByStatus(EnrollmentStatus.IN_PROGRESS)
                + countEnrollmentsByStatus(EnrollmentStatus.ASSIGNED);
        long completedEnrollments = countEnrollmentsByStatus(EnrollmentStatus.COMPLETED);
        long overdueEnrollments = countOverdueEnrollments();
        long mandatoryOutstanding = countOverdueMandatory();
        long totalLearners = countDistinctLearners();
        long totalAttempts = attempts.count();
        long passedAttempts = countPassedAttempts();
        return new OrgOverview(
                totalCourses,
                publishedCourses,
                totalEnrollments,
                activeEnrollments,
                completedEnrollments,
                overdueEnrollments,
                mandatoryOutstanding,
                totalLearners,
                totalAttempts,
                passedAttempts);
    }

    public List<CourseReport> courseSummaries() {
        List<Course> all = courses.findAll();
        List<CourseReport> result = new ArrayList<>(all.size());
        for (Course c : all) {
            result.add(summarize(c));
        }
        result.sort(Comparator
                .comparingLong(CourseReport::overdue).reversed()
                .thenComparingLong(CourseReport::totalEnrolled).reversed());
        return result;
    }

    public CourseReport courseSummary(UUID courseId) {
        Course c = courses.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course", courseId));
        return summarize(c);
    }

    public List<EnrollmentDto> courseRoster(UUID courseId, EnrollmentStatus status) {
        if (!courses.existsById(courseId)) {
            throw new CourseNotFoundException("Course", courseId);
        }
        return enrollments.findByCourse(courseId, status,
                        org.springframework.data.domain.PageRequest.of(0, 1000))
                .getContent().stream()
                .map(EnrollmentDto::from)
                .toList();
    }

    public List<EnrollmentDto> overdueAcrossAllCourses() {
        OffsetDateTime now = OffsetDateTime.now();
        List<Enrollment> overdue = em.createQuery("""
                        SELECT e FROM Enrollment e
                        WHERE e.dueAt IS NOT NULL
                          AND e.dueAt < :now
                          AND e.status NOT IN (com.lms.course.enrollment.EnrollmentStatus.COMPLETED,
                                               com.lms.course.enrollment.EnrollmentStatus.WAIVED)
                        ORDER BY e.dueAt ASC
                        """, Enrollment.class)
                .setParameter("now", now)
                .setMaxResults(1000)
                .getResultList();
        return overdue.stream().map(EnrollmentDto::from).toList();
    }

    public LearnerReport learnerReport(UUID userId) {
        List<Enrollment> userEnrollments = enrollments.findByUser(userId, null);
        long completed = userEnrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED)
                .count();
        long overdueCount = userEnrollments.stream()
                .filter(e -> e.getDueAt() != null
                        && e.getStatus() != EnrollmentStatus.COMPLETED
                        && e.getStatus() != EnrollmentStatus.WAIVED
                        && e.getDueAt().isBefore(OffsetDateTime.now()))
                .count();

        List<Attempt> userAttempts = em.createQuery("""
                        SELECT a FROM Attempt a
                        WHERE a.userId = :uid
                          AND a.submittedAt IS NOT NULL
                        ORDER BY a.submittedAt DESC
                        """, Attempt.class)
                .setParameter("uid", userId)
                .setMaxResults(50)
                .getResultList();
        long passedAttempts = userAttempts.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();
        Double avgScore = userAttempts.isEmpty() ? null
                : userAttempts.stream()
                        .filter(a -> a.getScorePct() != null)
                        .mapToInt(Attempt::getScorePct)
                        .average()
                        .orElse(0.0);
        if (avgScore != null) avgScore = round1(avgScore);

        String email = userEnrollments.isEmpty() ? null : userEnrollments.get(0).getUserEmail();
        String name = userEnrollments.isEmpty() ? null : userEnrollments.get(0).getUserName();

        return new LearnerReport(
                userId,
                email,
                name,
                userEnrollments.size(),
                completed,
                overdueCount,
                userAttempts.size(),
                passedAttempts,
                avgScore,
                userEnrollments.stream().map(EnrollmentDto::from).toList(),
                userAttempts.stream().map(AttemptDto::from).toList());
    }

    // ---- internals ----

    private CourseReport summarize(Course c) {
        List<Enrollment> roster = enrollments.findByCourse(c.getId(), null,
                        org.springframework.data.domain.PageRequest.of(0, 5000))
                .getContent();
        OffsetDateTime now = OffsetDateTime.now();
        long assigned = 0, inProgress = 0, completed = 0, waived = 0, overdue = 0;
        long mandatoryEnrolled = 0, mandatoryCompleted = 0;
        long progressSum = 0;
        for (Enrollment e : roster) {
            switch (e.getStatus()) {
                case ASSIGNED -> assigned++;
                case IN_PROGRESS -> inProgress++;
                case COMPLETED -> completed++;
                case WAIVED -> waived++;
            }
            if (e.getDueAt() != null
                    && e.getStatus() != EnrollmentStatus.COMPLETED
                    && e.getStatus() != EnrollmentStatus.WAIVED
                    && e.getDueAt().isBefore(now)) {
                overdue++;
            }
            if (e.isMandatory()) {
                mandatoryEnrolled++;
                if (e.getStatus() == EnrollmentStatus.COMPLETED) mandatoryCompleted++;
            }
            progressSum += e.getProgressPct();
        }
        double avgProgress = roster.isEmpty() ? 0.0 : round1(progressSum / (double) roster.size());

        // Quiz stats for this course
        List<Quiz> courseQuizzes = quizzes.findByCourseIdOrderByPositionAsc(c.getId());
        Set<UUID> quizIds = new HashSet<>();
        courseQuizzes.forEach(q -> quizIds.add(q.getId()));
        long totalAttempts = 0;
        long passedAttempts = 0;
        Double avgScore = null;
        if (!quizIds.isEmpty()) {
            List<Attempt> courseAttempts = em.createQuery("""
                            SELECT a FROM Attempt a
                            WHERE a.quizId IN :ids
                              AND a.submittedAt IS NOT NULL
                            """, Attempt.class)
                    .setParameter("ids", quizIds)
                    .getResultList();
            totalAttempts = courseAttempts.size();
            passedAttempts = courseAttempts.stream()
                    .filter(a -> Boolean.TRUE.equals(a.getPassed())).count();
            if (totalAttempts > 0) {
                avgScore = round1(courseAttempts.stream()
                        .filter(a -> a.getScorePct() != null)
                        .mapToInt(Attempt::getScorePct)
                        .average()
                        .orElse(0.0));
            }
        }

        return new CourseReport(
                c.getId(),
                c.getTitle(),
                c.getStatus().name(),
                roster.size(),
                assigned,
                inProgress,
                completed,
                waived,
                overdue,
                mandatoryEnrolled,
                mandatoryCompleted,
                avgProgress,
                avgScore,
                totalAttempts,
                passedAttempts);
    }

    private long countCoursesByStatus(String status) {
        return em.createQuery(
                        "SELECT COUNT(c) FROM Course c WHERE c.status = com.lms.course.domain.CourseStatus."
                                + status,
                        Long.class)
                .getSingleResult();
    }

    private long countEnrollmentsByStatus(EnrollmentStatus status) {
        return em.createQuery(
                        "SELECT COUNT(e) FROM Enrollment e WHERE e.status = :s", Long.class)
                .setParameter("s", status)
                .getSingleResult();
    }

    private long countOverdueEnrollments() {
        return em.createQuery("""
                        SELECT COUNT(e) FROM Enrollment e
                        WHERE e.dueAt IS NOT NULL
                          AND e.dueAt < :now
                          AND e.status NOT IN (com.lms.course.enrollment.EnrollmentStatus.COMPLETED,
                                               com.lms.course.enrollment.EnrollmentStatus.WAIVED)
                        """, Long.class)
                .setParameter("now", OffsetDateTime.now())
                .getSingleResult();
    }

    private long countOverdueMandatory() {
        return em.createQuery("""
                        SELECT COUNT(e) FROM Enrollment e
                        WHERE e.mandatory = true
                          AND e.dueAt IS NOT NULL
                          AND e.dueAt < :now
                          AND e.status NOT IN (com.lms.course.enrollment.EnrollmentStatus.COMPLETED,
                                               com.lms.course.enrollment.EnrollmentStatus.WAIVED)
                        """, Long.class)
                .setParameter("now", OffsetDateTime.now())
                .getSingleResult();
    }

    private long countDistinctLearners() {
        return em.createQuery(
                        "SELECT COUNT(DISTINCT e.userId) FROM Enrollment e", Long.class)
                .getSingleResult();
    }

    private long countPassedAttempts() {
        return em.createQuery(
                        "SELECT COUNT(a) FROM Attempt a WHERE a.passed = true", Long.class)
                .getSingleResult();
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    /** Group counts of enrollments by status for chip-bar UI. */
    public Map<EnrollmentStatus, Long> statusBreakdown() {
        Map<EnrollmentStatus, Long> out = new HashMap<>();
        for (EnrollmentStatus s : EnrollmentStatus.values()) {
            out.put(s, countEnrollmentsByStatus(s));
        }
        return out;
    }
}
