package com.lms.course.template;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.Lesson;
import com.lms.course.repository.CourseRepository;
import com.lms.course.web.dto.CourseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class CourseTemplateController {

    private final CourseTemplateCatalog catalog;
    private final CourseRepository courses;

    public CourseTemplateController(CourseTemplateCatalog catalog, CourseRepository courses) {
        this.catalog = catalog;
        this.courses = courses;
    }

    @GetMapping("/course-templates")
    public List<TemplateSummary> list() {
        return catalog.list().stream()
                .map(t -> new TemplateSummary(t.id(), t.name(), t.description(),
                        t.modules().size(), t.lessonCount()))
                .toList();
    }

    @PostMapping("/courses/from-template")
    @Transactional
    public ResponseEntity<CourseDto> createFromTemplate(@RequestBody CreateFromTemplateRequest req) {
        var template = catalog.find(req.templateId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown template: " + req.templateId()));

        Course c = new Course();
        c.setTitle(req.title() == null || req.title().isBlank() ? template.name() : req.title());
        c.setDescription(template.description());

        for (var tm : template.modules()) {
            CourseModule m = new CourseModule();
            m.setTitle(tm.title());
            c.addModule(m);
            for (var tl : tm.lessons()) {
                Lesson l = new Lesson();
                l.setTitle(tl.title());
                l.setContent(tl.content());
                l.setDurationSecs(tl.durationSecs());
                m.addLesson(l);
            }
        }

        Course saved = courses.save(c);
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + saved.getId()))
                .body(CourseDto.from(saved));
    }

    public record TemplateSummary(String id, String name, String description,
                                  int moduleCount, int lessonCount) {}

    public record CreateFromTemplateRequest(String templateId, String title) {}
}
