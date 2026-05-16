package com.lms.course.web.graphql;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.CourseStatus;
import com.lms.course.domain.Lesson;
import com.lms.course.repository.CourseRepository;
import com.lms.course.service.CourseService;
import com.lms.course.web.dto.CreateCourseRequest;
import com.lms.course.web.dto.CreateLessonRequest;
import com.lms.course.web.dto.CreateModuleRequest;
import com.lms.course.web.dto.UpdateCourseRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

@Controller
public class CourseGraphQLController {

    private final CourseService service;
    private final CourseRepository courses;

    public CourseGraphQLController(CourseService service, CourseRepository courses) {
        this.service = service;
        this.courses = courses;
    }

    @QueryMapping
    public Course course(@Argument UUID id) {
        return service.get(id);
    }

    @QueryMapping
    public List<Course> courses(@Argument CourseStatus status,
                                @Argument Integer page,
                                @Argument Integer size) {
        var pageable = PageRequest.of(page == null ? 0 : page, size == null ? 20 : size);
        return service.list(status, pageable).getContent();
    }

    @QueryMapping
    public List<Course> searchCourses(@Argument String q,
                                      @Argument Integer page,
                                      @Argument Integer size) {
        if (q == null || q.isBlank()) return List.of();
        return courses.search(q.trim(), PageRequest.of(page == null ? 0 : page, size == null ? 20 : size))
                .getContent();
    }

    @MutationMapping
    public Course createCourse(@Argument CreateCourseInput input) {
        return service.create(new CreateCourseRequest(input.title(), input.description()));
    }

    @MutationMapping
    public Course updateCourse(@Argument UUID id, @Argument UpdateCourseInput input) {
        return service.update(id, new UpdateCourseRequest(input.title(), input.description(), input.status()));
    }

    @MutationMapping
    public boolean deleteCourse(@Argument UUID id) {
        service.delete(id);
        return true;
    }

    @MutationMapping
    public Course publishCourse(@Argument UUID id) {
        return service.publish(id);
    }

    @MutationMapping
    public Course unpublishCourse(@Argument UUID id) {
        return service.unpublish(id);
    }

    @MutationMapping
    public Course archiveCourse(@Argument UUID id) {
        return service.archive(id);
    }

    @MutationMapping
    public CourseModule addModule(@Argument UUID courseId, @Argument ModuleInputDto input) {
        return service.addModule(courseId, new CreateModuleRequest(input.title()));
    }

    @MutationMapping
    public Lesson addLesson(@Argument UUID moduleId, @Argument LessonInputDto input) {
        return service.addLesson(moduleId, new CreateLessonRequest(input.title(), input.content(), input.durationSecs()));
    }

    public record CreateCourseInput(String title, String description) {}
    public record UpdateCourseInput(String title, String description, CourseStatus status) {}
    public record ModuleInputDto(String title) {}
    public record LessonInputDto(String title, String content, Integer durationSecs) {}
}
