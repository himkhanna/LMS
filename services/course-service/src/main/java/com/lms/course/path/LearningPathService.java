package com.lms.course.path;

import com.lms.course.domain.Course;
import com.lms.course.enrollment.AssignRequest;
import com.lms.course.enrollment.Enrollment;
import com.lms.course.enrollment.EnrollmentRepository;
import com.lms.course.enrollment.EnrollmentService;
import com.lms.course.enrollment.EnrollmentStatus;
import com.lms.course.repository.CourseRepository;
import com.lms.course.service.CourseNotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class LearningPathService {

    @PersistenceContext
    private EntityManager em;

    private final LearningPathRepository paths;
    private final LearningPathCourseRepository pathCourses;
    private final LearningPathAssignmentRepository assignments;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final EnrollmentService enrollmentService;

    public LearningPathService(LearningPathRepository paths,
                               LearningPathCourseRepository pathCourses,
                               LearningPathAssignmentRepository assignments,
                               CourseRepository courses,
                               EnrollmentRepository enrollments,
                               @Lazy @Autowired EnrollmentService enrollmentService) {
        this.paths = paths;
        this.pathCourses = pathCourses;
        this.assignments = assignments;
        this.courses = courses;
        this.enrollments = enrollments;
        this.enrollmentService = enrollmentService;
    }

    public record CreatePath(String title, String description, String summary,
                             String coverColor, List<String> tags) {}

    public record UpdatePath(String title, String description, String summary,
                             String coverColor, List<String> tags, LearningPathStatus status) {}

    public LearningPath create(CreatePath req) {
        if (req.title() == null || req.title().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        LearningPath p = new LearningPath();
        p.setTitle(req.title().trim());
        p.setDescription(req.description());
        p.setSummary(safe(req.summary()));
        p.setCoverColor(safe(req.coverColor()));
        if (req.tags() != null) p.setTags(req.tags());
        return paths.save(p);
    }

    public LearningPath update(UUID id, UpdatePath req) {
        LearningPath p = get(id);
        if (req.title() != null) p.setTitle(req.title());
        if (req.description() != null) p.setDescription(req.description());
        if (req.summary() != null) p.setSummary(safe(req.summary()));
        if (req.coverColor() != null) p.setCoverColor(safe(req.coverColor()));
        if (req.tags() != null) p.setTags(req.tags());
        if (req.status() != null) {
            if (req.status() == LearningPathStatus.PUBLISHED && p.getPublishedAt() == null) {
                p.setPublishedAt(OffsetDateTime.now());
            }
            p.setStatus(req.status());
        }
        return p;
    }

    public void delete(UUID id) {
        if (!paths.existsById(id)) throw new CourseNotFoundException("LearningPath", id);
        paths.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<LearningPath> list() {
        return paths.findAllByOrderByUpdatedAtDesc();
    }

    @Transactional(readOnly = true)
    public LearningPath get(UUID id) {
        return paths.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("LearningPath", id));
    }

    public LearningPathCourse addCourse(UUID pathId, UUID courseId, Boolean required) {
        LearningPath p = get(pathId);
        Course c = courses.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course", courseId));
        // Duplicate guard
        for (LearningPathCourse lpc : p.getCourses()) {
            if (lpc.getCourse().getId().equals(courseId)) return lpc;
        }
        LearningPathCourse lpc = new LearningPathCourse();
        lpc.setCourse(c);
        lpc.setRequired(required == null ? true : required);
        p.addCourse(lpc);
        paths.flush();
        return lpc;
    }

    public void removeCourse(UUID linkId) {
        if (!pathCourses.existsById(linkId)) {
            throw new CourseNotFoundException("LearningPathCourse", linkId);
        }
        pathCourses.deleteById(linkId);
    }

    public void reorderCourses(UUID pathId, List<UUID> linkIdsInOrder) {
        if (linkIdsInOrder == null || linkIdsInOrder.isEmpty()) return;
        var found = pathCourses.findAllById(linkIdsInOrder);
        if (found.size() != linkIdsInOrder.size()) {
            throw new CourseNotFoundException("LearningPathCourse", linkIdsInOrder.get(0));
        }
        Map<UUID, LearningPathCourse> byId = new HashMap<>();
        for (LearningPathCourse lpc : found) {
            if (!lpc.getPath().getId().equals(pathId)) {
                throw new IllegalArgumentException("Link " + lpc.getId() + " is not in path " + pathId);
            }
            byId.put(lpc.getId(), lpc);
        }
        // Two-pass to avoid (path_id, position) uniqueness conflict
        for (int i = 0; i < linkIdsInOrder.size(); i++) {
            byId.get(linkIdsInOrder.get(i)).setPosition(-(i + 1));
        }
        em.flush();
        for (int i = 0; i < linkIdsInOrder.size(); i++) {
            byId.get(linkIdsInOrder.get(i)).setPosition(i);
        }
    }

    public record AssignResult(int created, int skipped, List<LearningPathAssignment> assignments) {}

    /**
     * Assign a path to learners. Creates a path_assignment row + an
     * enrollment for each course in the path (idempotent at both levels).
     */
    public AssignResult assign(UUID pathId, AssignRequest req, String assignedByEmail) {
        LearningPath path = get(pathId);
        boolean mandatory = Boolean.TRUE.equals(req.mandatory());
        int created = 0, skipped = 0;
        List<LearningPathAssignment> rows = new ArrayList<>();

        for (AssignRequest.Learner l : req.learners()) {
            if (l.userId() == null || l.email() == null || l.email().isBlank()) {
                skipped++;
                continue;
            }
            Optional<LearningPathAssignment> existing = assignments.findByPathIdAndUserId(pathId, l.userId());
            LearningPathAssignment a = existing.orElseGet(LearningPathAssignment::new);
            boolean isNew = a.getId() == null;
            if (isNew) {
                a.setPath(path);
                a.setUserId(l.userId());
                a.setUserEmail(l.email());
            }
            a.setUserName(l.displayName());
            a.setManagerEmail(l.managerEmail());
            a.setDepartment(l.department());
            a.setMandatory(mandatory);
            a.setAssignedByEmail(assignedByEmail);
            if (req.dueAt() != null) a.setDueAt(req.dueAt());
            if (isNew) {
                a.setStatus(EnrollmentStatus.ASSIGNED);
                assignments.save(a);
                created++;
            } else {
                skipped++;
            }
            rows.add(a);

            // Enroll the learner in each course of the path so /my-learning
            // already shows them. Idempotent — re-uses existing enrollments.
            AssignRequest perCourseReq = new AssignRequest(
                    List.of(l), req.dueAt(), mandatory);
            for (LearningPathCourse lpc : path.getCourses()) {
                enrollmentService.assign(lpc.getCourse().getId(), perCourseReq, assignedByEmail);
            }
        }

        // recompute progress after enrollments are in place
        for (LearningPathAssignment a : rows) {
            recomputeAssignment(a);
        }
        return new AssignResult(created, skipped, rows);
    }

    public void unassign(UUID assignmentId) {
        if (!assignments.existsById(assignmentId)) {
            throw new CourseNotFoundException("LearningPathAssignment", assignmentId);
        }
        // We intentionally leave the per-course enrollments in place — HR may
        // want to keep the learner enrolled in the individual courses even
        // after removing them from the path.
        assignments.deleteById(assignmentId);
    }

    @Transactional(readOnly = true)
    public List<LearningPathAssignment> listForUser(UUID userId) {
        return assignments.findByUserIdOrderByAssignedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<LearningPathAssignment> listForPath(UUID pathId) {
        return assignments.findByPathIdOrderByAssignedAtDesc(pathId);
    }

    /**
     * Recompute progress for any path the given (user, course) participates
     * in. Called by EnrollmentService whenever a course-level recompute
     * runs, so path % stays in sync with course completion automatically.
     */
    public void recomputeAfterCourseChange(UUID userId, UUID courseId) {
        List<LearningPathCourse> links = pathCourses.findByCourseId(courseId);
        for (LearningPathCourse link : links) {
            assignments.findByPathIdAndUserId(link.getPath().getId(), userId)
                    .ifPresent(this::recomputeAssignment);
        }
    }

    private void recomputeAssignment(LearningPathAssignment a) {
        LearningPath path = a.getPath();
        List<LearningPathCourse> courseLinks = path.getCourses();
        if (courseLinks.isEmpty()) return;
        int total = 0;
        int done = 0;
        for (LearningPathCourse link : courseLinks) {
            if (!link.isRequired()) continue;
            total++;
            Optional<Enrollment> e = enrollments.findByCourseIdAndUserId(
                    link.getCourse().getId(), a.getUserId());
            if (e.isPresent() && e.get().getStatus() == EnrollmentStatus.COMPLETED) {
                done++;
            }
        }
        if (total == 0) return;
        int pct = (int) Math.round((done * 100.0) / total);
        a.setProgressPct(pct);
        if (a.getStartedAt() == null && done > 0) a.setStartedAt(OffsetDateTime.now());
        if (pct >= 100) {
            a.setStatus(EnrollmentStatus.COMPLETED);
            if (a.getCompletedAt() == null) a.setCompletedAt(OffsetDateTime.now());
        } else if (a.getStatus() == EnrollmentStatus.ASSIGNED && done > 0) {
            a.setStatus(EnrollmentStatus.IN_PROGRESS);
        }
    }

    private static String safe(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
