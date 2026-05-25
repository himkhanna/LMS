package com.lms.course.path;

import com.lms.course.enrollment.AssignRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class LearningPathController {

    private final LearningPathService service;

    public LearningPathController(LearningPathService service) {
        this.service = service;
    }

    // ---- Authoring (admin/HR/instructor) ----

    @GetMapping("/learning-paths")
    public List<LearningPathDto> list() {
        return service.list().stream().map(LearningPathDto::summary).toList();
    }

    @GetMapping("/learning-paths/{id}")
    public LearningPathDto get(@PathVariable UUID id) {
        return LearningPathDto.full(service.get(id));
    }

    @PostMapping("/learning-paths")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<LearningPathDto> create(
            @Valid @RequestBody LearningPathService.CreatePath req) {
        var p = service.create(req);
        return ResponseEntity.status(201).body(LearningPathDto.full(p));
    }

    @PatchMapping("/learning-paths/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public LearningPathDto update(@PathVariable UUID id,
                                  @RequestBody LearningPathService.UpdatePath req) {
        return LearningPathDto.full(service.update(id, req));
    }

    @DeleteMapping("/learning-paths/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    public record AddCourse(UUID courseId, Boolean required) {}

    @PostMapping("/learning-paths/{id}/courses")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public LearningPathDto.PathCourseDto addCourse(@PathVariable UUID id,
                                                   @RequestBody AddCourse req) {
        return LearningPathDto.PathCourseDto.from(
                service.addCourse(id, req.courseId(), req.required()));
    }

    @DeleteMapping("/learning-path-courses/{linkId}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<Void> removeCourse(@PathVariable UUID linkId) {
        service.removeCourse(linkId);
        return ResponseEntity.noContent().build();
    }

    public record ReorderRequest(List<UUID> ids) {}

    @PatchMapping("/learning-paths/{id}/courses/order")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<Void> reorderCourses(@PathVariable UUID id,
                                               @RequestBody ReorderRequest req) {
        service.reorderCourses(id, req.ids());
        return ResponseEntity.noContent().build();
    }

    // ---- Assignment ----

    public record AssignResponse(int created, int skipped, List<LearningPathAssignmentDto> assignments) {}

    @PostMapping("/learning-paths/{id}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public AssignResponse assign(@PathVariable UUID id,
                                 @Valid @RequestBody AssignRequest req,
                                 @AuthenticationPrincipal Jwt jwt) {
        String byEmail = jwt != null ? jwt.getClaimAsString("email") : null;
        var result = service.assign(id, req, byEmail);
        return new AssignResponse(
                result.created(), result.skipped(),
                result.assignments().stream().map(LearningPathAssignmentDto::from).toList());
    }

    @GetMapping("/learning-paths/{id}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public List<LearningPathAssignmentDto> roster(@PathVariable UUID id) {
        return service.listForPath(id).stream().map(LearningPathAssignmentDto::from).toList();
    }

    @DeleteMapping("/learning-path-assignments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public ResponseEntity<Void> unassign(@PathVariable UUID id) {
        service.unassign(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Learner-facing ----

    @GetMapping("/me/learning-paths")
    public List<LearningPathAssignmentDto> mine(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        return service.listForUser(userId).stream()
                .map(LearningPathAssignmentDto::from)
                .toList();
    }

    private static UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new IllegalStateException("Missing authenticated user");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
