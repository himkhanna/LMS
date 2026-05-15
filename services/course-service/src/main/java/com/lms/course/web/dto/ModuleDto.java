package com.lms.course.web.dto;

import com.lms.course.domain.CourseModule;

import java.util.List;
import java.util.UUID;

public record ModuleDto(
        UUID id,
        String title,
        int position,
        List<LessonDto> lessons
) {
    public static ModuleDto from(CourseModule m) {
        return new ModuleDto(
                m.getId(),
                m.getTitle(),
                m.getPosition(),
                m.getLessons().stream().map(LessonDto::from).toList()
        );
    }
}
