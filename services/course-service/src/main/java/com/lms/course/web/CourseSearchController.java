package com.lms.course.web;

import com.lms.course.repository.CourseRepository;
import com.lms.course.web.dto.CourseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/courses/search")
public class CourseSearchController {

    private final CourseRepository courses;

    public CourseSearchController(CourseRepository courses) {
        this.courses = courses;
    }

    @GetMapping
    public Page<CourseDto> search(@RequestParam("q") String q, Pageable pageable) {
        if (q == null || q.isBlank()) {
            return Page.empty(pageable);
        }
        return courses.search(q.trim(), pageable).map(CourseDto::summary);
    }
}
