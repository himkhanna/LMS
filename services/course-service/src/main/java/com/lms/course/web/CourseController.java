package com.lms.course.web;

import com.lms.course.domain.CourseStatus;
import com.lms.course.service.CourseService;
import com.lms.course.web.dto.*;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseController {

    private final CourseService service;

    public CourseController(CourseService service) {
        this.service = service;
    }

    @GetMapping
    public Page<CourseDto> list(@RequestParam(required = false) CourseStatus status, Pageable pageable) {
        return service.list(status, pageable).map(CourseDto::summary);
    }

    @GetMapping("/{id}")
    public CourseDto get(@PathVariable UUID id) {
        return CourseDto.from(service.get(id));
    }

    @PostMapping
    public ResponseEntity<CourseDto> create(@Valid @RequestBody CreateCourseRequest req) {
        var created = service.create(req);
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + created.getId()))
                .body(CourseDto.from(created));
    }

    @PatchMapping("/{id}")
    public CourseDto update(@PathVariable UUID id, @Valid @RequestBody UpdateCourseRequest req) {
        return CourseDto.from(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/modules")
    public ResponseEntity<ModuleDto> addModule(@PathVariable UUID id, @Valid @RequestBody CreateModuleRequest req) {
        var m = service.addModule(id, req);
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + id + "/modules/" + m.getId()))
                .body(ModuleDto.from(m));
    }

    @PostMapping("/modules/{moduleId}/lessons")
    public ResponseEntity<LessonDto> addLesson(@PathVariable UUID moduleId, @Valid @RequestBody CreateLessonRequest req) {
        var l = service.addLesson(moduleId, req);
        return ResponseEntity
                .created(URI.create("/api/v1/courses/lessons/" + l.getId()))
                .body(LessonDto.from(l));
    }

    public record BulkDurationRequest(Integer secs) {}

    /**
     * Set the same per-slide duration on every lesson in the course.
     * Used by HR to tune the slideshow "Next in Ns" gate after upload.
     * Lesson-by-lesson tweaks are still available via /lessons/{id}.
     */
    @PostMapping("/{id}/lessons/bulk-duration")
    public ResponseEntity<Void> setBulkDuration(@PathVariable UUID id,
                                                @RequestBody BulkDurationRequest req) {
        if (req == null || req.secs() == null || req.secs() <= 0) {
            throw new IllegalArgumentException("secs must be a positive integer");
        }
        service.setAllLessonDurations(id, req.secs());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/publish")
    public CourseDto publish(@PathVariable UUID id) {
        return CourseDto.from(service.publish(id));
    }

    @PostMapping("/{id}/unpublish")
    public CourseDto unpublish(@PathVariable UUID id) {
        return CourseDto.from(service.unpublish(id));
    }

    @PostMapping("/{id}/archive")
    public CourseDto archive(@PathVariable UUID id) {
        return CourseDto.from(service.archive(id));
    }
}
