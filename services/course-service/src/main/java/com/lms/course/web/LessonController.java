package com.lms.course.web;

import com.lms.course.repository.CourseModuleRepository;
import com.lms.course.repository.LessonRepository;
import com.lms.course.service.CourseNotFoundException;
import com.lms.course.web.dto.LessonDto;
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

    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!lessons.existsById(id)) throw new CourseNotFoundException("Lesson", id);
        lessons.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/modules/{id}")
    public ResponseEntity<Void> deleteModule(@PathVariable UUID id) {
        if (!modules.existsById(id)) throw new CourseNotFoundException("Module", id);
        modules.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
