package com.lms.course.enrollment;

import com.lms.course.domain.Course;
import com.lms.course.repository.CourseRepository;
import com.lms.course.repository.LessonRepository;
import com.lms.course.service.CourseNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class EnrollmentService {

    private final EnrollmentRepository enrollments;
    private final LessonProgressRepository progress;
    private final CourseRepository courses;
    private final LessonRepository lessons;

    public EnrollmentService(EnrollmentRepository enrollments,
                             LessonProgressRepository progress,
                             CourseRepository courses,
                             LessonRepository lessons) {
        this.enrollments = enrollments;
        this.progress = progress;
        this.courses = courses;
        this.lessons = lessons;
    }

    public record AssignResult(int created, int skipped, List<Enrollment> enrollments) {}

    public AssignResult assign(UUID courseId, AssignRequest req, String assignedByEmail) {
        Course course = courses.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course", courseId));

        int created = 0;
        int skipped = 0;
        List<Enrollment> all = new ArrayList<>();
        boolean mandatory = Boolean.TRUE.equals(req.mandatory());

        for (AssignRequest.Learner l : req.learners()) {
            if (l.userId() == null || l.email() == null || l.email().isBlank()) {
                skipped++;
                continue;
            }
            Optional<Enrollment> existing = enrollments.findByCourseIdAndUserId(courseId, l.userId());
            Enrollment e = existing.orElseGet(Enrollment::new);
            boolean isNew = existing.isEmpty();
            if (isNew) {
                e.setCourse(course);
                e.setUserId(l.userId());
                e.setUserEmail(l.email());
            }
            // refresh on every assign so HR can re-send with new due date / mandatory flag
            e.setUserName(l.displayName());
            e.setMandatory(mandatory);
            e.setAssignedByEmail(assignedByEmail);
            if (req.dueAt() != null) e.setDueAt(req.dueAt());
            if (isNew) {
                e.setStatus(EnrollmentStatus.ASSIGNED);
                enrollments.save(e);
                created++;
            } else {
                skipped++;
            }
            all.add(e);
        }
        return new AssignResult(created, skipped, all);
    }

    @Transactional(readOnly = true)
    public List<Enrollment> listForCourse(UUID courseId, EnrollmentStatus status) {
        if (!courses.existsById(courseId)) {
            throw new CourseNotFoundException("Course", courseId);
        }
        return enrollments.findByCourse(courseId, status,
                org.springframework.data.domain.PageRequest.of(0, 500)).getContent();
    }

    @Transactional(readOnly = true)
    public List<Enrollment> listForUser(UUID userId, EnrollmentStatus status) {
        return enrollments.findByUser(userId, status);
    }

    public void unassign(UUID enrollmentId) {
        if (!enrollments.existsById(enrollmentId)) {
            throw new CourseNotFoundException("Enrollment", enrollmentId);
        }
        enrollments.deleteById(enrollmentId);
    }

    public Enrollment waive(UUID enrollmentId) {
        Enrollment e = enrollments.findById(enrollmentId)
                .orElseThrow(() -> new CourseNotFoundException("Enrollment", enrollmentId));
        e.setStatus(EnrollmentStatus.WAIVED);
        e.setCompletedAt(OffsetDateTime.now());
        return e;
    }

    // ---- Lesson progress (called by learners as they consume content) ----

    public LessonProgress recordLessonStarted(UUID userId, UUID lessonId) {
        var lesson = lessons.findById(lessonId)
                .orElseThrow(() -> new CourseNotFoundException("Lesson", lessonId));
        UUID courseId = lesson.getModule().getCourse().getId();
        LessonProgress p = progress.findByUserIdAndLessonId(userId, lessonId).orElseGet(() -> {
            LessonProgress np = new LessonProgress();
            np.setUserId(userId);
            np.setLessonId(lessonId);
            np.setCourseId(courseId);
            np.setStatus(LessonProgressStatus.STARTED);
            return progress.save(np);
        });
        markEnrollmentStartedIfNeeded(userId, courseId);
        return p;
    }

    public LessonProgress recordLessonCompleted(UUID userId, UUID lessonId) {
        var lesson = lessons.findById(lessonId)
                .orElseThrow(() -> new CourseNotFoundException("Lesson", lessonId));
        UUID courseId = lesson.getModule().getCourse().getId();
        LessonProgress p = progress.findByUserIdAndLessonId(userId, lessonId).orElseGet(() -> {
            LessonProgress np = new LessonProgress();
            np.setUserId(userId);
            np.setLessonId(lessonId);
            np.setCourseId(courseId);
            return np;
        });
        p.setStatus(LessonProgressStatus.COMPLETED);
        p.setCompletedAt(OffsetDateTime.now());
        if (p.getId() == null) progress.save(p);
        recomputeEnrollmentProgress(userId, courseId);
        return p;
    }

    @Transactional(readOnly = true)
    public List<LessonProgress> lessonProgressForCourse(UUID userId, UUID courseId) {
        return progress.findByUserIdAndCourseId(userId, courseId);
    }

    private void markEnrollmentStartedIfNeeded(UUID userId, UUID courseId) {
        enrollments.findByCourseIdAndUserId(courseId, userId).ifPresent(e -> {
            if (e.getStatus() == EnrollmentStatus.ASSIGNED) {
                e.setStatus(EnrollmentStatus.IN_PROGRESS);
                e.setStartedAt(OffsetDateTime.now());
            }
        });
    }

    private void recomputeEnrollmentProgress(UUID userId, UUID courseId) {
        Course course = courses.findById(courseId).orElse(null);
        if (course == null) return;
        int totalLessons = course.getModules().stream()
                .mapToInt(m -> m.getLessons().size())
                .sum();
        if (totalLessons == 0) return;
        long completed = progress.countByUserIdAndCourseIdAndStatus(
                userId, courseId, LessonProgressStatus.COMPLETED);
        int pct = (int) Math.round((completed * 100.0) / totalLessons);
        enrollments.findByCourseIdAndUserId(courseId, userId).ifPresent(e -> {
            e.setProgressPct(pct);
            if (e.getStartedAt() == null) e.setStartedAt(OffsetDateTime.now());
            if (pct >= 100) {
                e.setStatus(EnrollmentStatus.COMPLETED);
                if (e.getCompletedAt() == null) e.setCompletedAt(OffsetDateTime.now());
            } else if (e.getStatus() == EnrollmentStatus.ASSIGNED) {
                e.setStatus(EnrollmentStatus.IN_PROGRESS);
            }
        });
    }
}
