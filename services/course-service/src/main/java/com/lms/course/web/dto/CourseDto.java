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
        String summary,
        String coverColor,
        List<String> tags,
        CourseStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime publishedAt,
        List<ModuleDto> modules
) {
    public static CourseDto from(Course c) {
        return new CourseDto(
                c.getId(),
                c.getTitle(),
                c.getDescription(),
                c.getSummary(),
                c.getCoverColor(),
                c.getTags(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                c.getPublishedAt(),
                c.getModules().stream().map(ModuleDto::from).toList()
        );
    }

    public static CourseDto summary(Course c) {
        return new CourseDto(
                c.getId(),
                c.getTitle(),
                c.getDescription(),
                c.getSummary(),
                c.getCoverColor(),
                c.getTags(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt(),
                c.getPublishedAt(),
                List.of()
        );
    }
}
