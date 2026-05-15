package com.lms.course.web.dto;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CourseDto(
        UUID id,
        String title,
        String description,
        CourseStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<ModuleDto> modules
) {
    public static CourseDto from(Course c) {
        return new CourseDto(
                c.getId(),
                c.getTitle(),
                c.getDescription(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                c.getModules().stream().map(ModuleDto::from).toList()
        );
    }
}
