package com.lms.course.web;

import com.lms.course.repository.CourseModuleRepository;
import com.lms.course.repository.LessonRepository;
import com.lms.course.service.CourseNotFoundException;
import com.lms.course.web.dto.LessonDto;
import com.lms.course.web.dto.ModuleDto;
import com.lms.course.web.dto.UpdateLessonRequest;
import com.lms.course.web.dto.UpdateModuleRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class LessonController {

    private final LessonRepository lessons;
    private final CourseModuleRepository modules;

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
}
