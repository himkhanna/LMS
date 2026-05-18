package com.lms.course.enrollment;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class EnrollmentController {

    private final EnrollmentService service;

    public EnrollmentController(EnrollmentService service) {
        this.service = service;
    }

    public record AssignResponse(int created, int skipped, List<EnrollmentDto> enrollments) {}

    @PostMapping("/courses/{courseId}/enrollments")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public AssignResponse assign(@PathVariable UUID courseId,
                                 @Valid @RequestBody AssignRequest req,
                                 @AuthenticationPrincipal Jwt jwt) {
        String byEmail = jwt != null ? jwt.getClaimAsString("email") : null;
        var result = service.assign(courseId, req, byEmail);
        return new AssignResponse(
                result.created(),
                result.skipped(),
                result.enrollments().stream().map(EnrollmentDto::from).toList());
    }

    @GetMapping("/courses/{courseId}/enrollments")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public List<EnrollmentDto> listForCourse(@PathVariable UUID courseId,
                                             @RequestParam(required = false) EnrollmentStatus status) {
        return service.listForCourse(courseId, status).stream()
                .map(EnrollmentDto::from)
                .toList();
    }

    @DeleteMapping("/enrollments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public ResponseEntity<Void> unassign(@PathVariable UUID id) {
        service.unassign(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/enrollments/{id}/waive")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EnrollmentDto waive(@PathVariable UUID id) {
        return EnrollmentDto.from(service.waive(id));
    }

    // ---- Self-enrollment from the catalog ----

    /**
     * Any signed-in learner can self-enroll into a PUBLISHED course they
     * find in the catalog. Idempotent: returns the existing enrollment
     * if one exists. Created enrollments are never mandatory.
     */
    @PostMapping("/courses/{courseId}/enroll-me")
    public EnrollmentDto enrollMe(@PathVariable UUID courseId,
                                  @AuthenticationPrincipal Jwt jwt) {
        return EnrollmentDto.from(service.selfEnroll(
                courseId,
                currentUserId(jwt),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name")));
    }

    // ---- Learner-facing ----

    @GetMapping("/me/enrollments")
    public List<EnrollmentDto> myEnrollments(@RequestParam(required = false) EnrollmentStatus status,
                                             @AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        return service.listForUser(userId, status).stream()
                .map(EnrollmentDto::from)
                .toList();
    }

    @PostMapping("/me/lessons/{lessonId}/start")
    public LessonProgressDto markStarted(@PathVariable UUID lessonId,
                                         @AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        return LessonProgressDto.from(service.recordLessonStarted(userId, lessonId));
    }

    @PostMapping("/me/lessons/{lessonId}/complete")
    public LessonProgressDto markCompleted(@PathVariable UUID lessonId,
                                           @AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        return LessonProgressDto.from(service.recordLessonCompleted(userId, lessonId));
    }

    @GetMapping("/me/courses/{courseId}/progress")
    public List<LessonProgressDto> myCourseProgress(@PathVariable UUID courseId,
                                                    @AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        return service.lessonProgressForCourse(userId, courseId).stream()
                .map(LessonProgressDto::from)
                .toList();
    }

    private static UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new IllegalStateException("Missing authenticated user");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
