package com.lms.course.service;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.CourseStatus;
import com.lms.course.domain.Lesson;
import com.lms.course.events.CourseArchivedEvent;
import com.lms.course.events.CourseEventPublisher;
import com.lms.course.events.CoursePublishedEvent;
import com.lms.course.repository.CourseModuleRepository;
import com.lms.course.repository.CourseRepository;
import com.lms.course.web.dto.CreateCourseRequest;
import com.lms.course.web.dto.CreateLessonRequest;
import com.lms.course.web.dto.CreateModuleRequest;
import com.lms.course.web.dto.UpdateCourseRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class CourseService {

    private final CourseRepository courses;
    private final CourseModuleRepository modules;
    private final CourseEventPublisher events;

    public CourseService(CourseRepository courses, CourseModuleRepository modules, CourseEventPublisher events) {
        this.courses = courses;
        this.modules = modules;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public Page<Course> list(CourseStatus status, Pageable pageable) {
        return status == null ? courses.findAll(pageable) : courses.findByStatus(status, pageable);
    }

    @Transactional(readOnly = true)
    public Course get(UUID id) {
        return courses.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Course", id));
    }

    public Course create(CreateCourseRequest req) {
        Course c = new Course();
        c.setTitle(req.title());
        c.setDescription(req.description());
        return courses.save(c);
    }

    public Course update(UUID id, UpdateCourseRequest req) {
        Course c = get(id);
        if (req.title() != null) c.setTitle(req.title());
        if (req.description() != null) c.setDescription(req.description());
        if (req.status() != null) c.setStatus(req.status());
        return c;
    }

    public void delete(UUID id) {
        if (!courses.existsById(id)) {
            throw new CourseNotFoundException("Course", id);
        }
        courses.deleteById(id);
    }

    public CourseModule addModule(UUID courseId, CreateModuleRequest req) {
        Course c = get(courseId);
        CourseModule m = new CourseModule();
        m.setTitle(req.title());
        c.addModule(m);
        courses.flush();
        return m;
    }

    public Lesson addLesson(UUID moduleId, CreateLessonRequest req) {
        CourseModule m = modules.findById(moduleId)
                .orElseThrow(() -> new CourseNotFoundException("Module", moduleId));
        Lesson l = new Lesson();
        l.setTitle(req.title());
        l.setContent(req.content());
        l.setDurationSecs(req.durationSecs());
        m.addLesson(l);
        modules.flush();
        return l;
    }

    public Course publish(UUID id) {
        Course c = get(id);
        if (c.getStatus() == CourseStatus.PUBLISHED) {
            return c;
        }
        if (c.getModules().isEmpty()) {
            throw new InvalidTransitionException("Cannot publish a course with no modules");
        }
        boolean hasLesson = c.getModules().stream().anyMatch(m -> !m.getLessons().isEmpty());
        if (!hasLesson) {
            throw new InvalidTransitionException("Cannot publish a course with no lessons");
        }
        OffsetDateTime now = OffsetDateTime.now();
        c.setStatus(CourseStatus.PUBLISHED);
        c.setPublishedAt(now);
        events.publish(new CoursePublishedEvent(c.getId(), now));
        return c;
    }

    public Course unpublish(UUID id) {
        Course c = get(id);
        if (c.getStatus() != CourseStatus.PUBLISHED) {
            throw new InvalidTransitionException("Only a published course can be unpublished");
        }
        c.setStatus(CourseStatus.DRAFT);
        c.setPublishedAt(null);
        return c;
    }

    public Course archive(UUID id) {
        Course c = get(id);
        if (c.getStatus() == CourseStatus.ARCHIVED) {
            return c;
        }
        c.setStatus(CourseStatus.ARCHIVED);
        events.publish(new CourseArchivedEvent(c.getId(), OffsetDateTime.now()));
        return c;
    }
}
