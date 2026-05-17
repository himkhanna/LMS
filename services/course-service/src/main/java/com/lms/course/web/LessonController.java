package com.lms.course.web;

import com.lms.course.repository.CourseModuleRepository;
import com.lms.course.repository.LessonRepository;
import com.lms.course.service.CourseNotFoundException;
import com.lms.course.web.dto.LessonDto;
import com.lms.course.web.dto.ModuleDto;
import com.lms.course.web.dto.UpdateLessonRequest;
import com.lms.course.web.dto.UpdateModuleRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class LessonController {

    private final LessonRepository lessons;
    private final CourseModuleRepository modules;

    @PersistenceContext
    private EntityManager em;

    public LessonController(LessonRepository lessons, CourseModuleRepository modules) {
        this.lessons = lessons;
        this.modules = modules;
    }

    @GetMapping("/lessons/{id}")
    public LessonDto get(@PathVariable UUID id) {
        return lessons.findById(id)
                .map(LessonDto::from)
                .orElseThrow(() -> new CourseNotFoundException("Lesson", id));
    }

    @PatchMapping("/lessons/{id}")
    public LessonDto update(@PathVariable UUID id, @RequestBody UpdateLessonRequest req) {
        var lesson = lessons.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Lesson", id));
        if (req.title() != null) lesson.setTitle(req.title());
        if (req.content() != null) lesson.setContent(req.content());
        if (req.durationSecs() != null) lesson.setDurationSecs(req.durationSecs());
        return LessonDto.from(lesson);
    }

    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!lessons.existsById(id)) throw new CourseNotFoundException("Lesson", id);
        lessons.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/modules/{id}")
    public ModuleDto updateModule(@PathVariable UUID id, @RequestBody UpdateModuleRequest req) {
        var module = modules.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Module", id));
        if (req.title() != null) module.setTitle(req.title());
        return ModuleDto.from(module);
    }

    @DeleteMapping("/modules/{id}")
    public ResponseEntity<Void> deleteModule(@PathVariable UUID id) {
        if (!modules.existsById(id)) throw new CourseNotFoundException("Module", id);
        modules.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/courses/{courseId}/modules/order")
    public ResponseEntity<Void> reorderModules(@PathVariable UUID courseId,
                                               @RequestBody ReorderRequest req) {
        if (req == null || req.ids() == null || req.ids().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        var found = modules.findAllById(req.ids());
        if (found.size() != req.ids().size()) {
            throw new CourseNotFoundException("Module", req.ids().get(0));
        }
        Map<UUID, com.lms.course.domain.CourseModule> byId = new HashMap<>();
        for (var m : found) {
            if (!m.getCourse().getId().equals(courseId)) {
                throw new IllegalArgumentException("Module " + m.getId() + " is not in course " + courseId);
            }
            byId.put(m.getId(), m);
        }
        // Two-pass to avoid violating the (course_id, position) unique constraint mid-flush.
        for (int i = 0; i < req.ids().size(); i++) {
            byId.get(req.ids().get(i)).setPosition(-(i + 1));
        }
        em.flush();
        for (int i = 0; i < req.ids().size(); i++) {
            byId.get(req.ids().get(i)).setPosition(i);
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/modules/{moduleId}/lessons/order")
    public ResponseEntity<Void> reorderLessons(@PathVariable UUID moduleId,
                                               @RequestBody ReorderRequest req) {
        if (req == null || req.ids() == null || req.ids().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        var found = lessons.findAllById(req.ids());
        if (found.size() != req.ids().size()) {
            throw new CourseNotFoundException("Lesson", req.ids().get(0));
        }
        Map<UUID, com.lms.course.domain.Lesson> byId = new HashMap<>();
        for (var l : found) {
            if (!l.getModule().getId().equals(moduleId)) {
                throw new IllegalArgumentException("Lesson " + l.getId() + " is not in module " + moduleId);
            }
            byId.put(l.getId(), l);
        }
        for (int i = 0; i < req.ids().size(); i++) {
            byId.get(req.ids().get(i)).setPosition(-(i + 1));
        }
        em.flush();
        for (int i = 0; i < req.ids().size(); i++) {
            byId.get(req.ids().get(i)).setPosition(i);
        }
        return ResponseEntity.noContent().build();
    }

    public record ReorderRequest(List<UUID> ids) {}
}
