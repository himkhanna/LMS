package com.lms.course.web.dto;

import com.lms.course.domain.CourseStatus;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateCourseRequest(
        @Size(max = 255) String title,
        String description,
        @Size(max = 280) String summary,
        @Size(max = 7) String coverColor,
        List<String> tags,
        CourseStatus status
) {}
