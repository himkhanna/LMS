package com.lms.course.web.dto;

import com.lms.course.domain.CourseStatus;
import jakarta.validation.constraints.Size;

public record UpdateCourseRequest(
        @Size(max = 255) String title,
        String description,
        CourseStatus status
) {}
