package com.lms.course.web.dto;

import com.lms.course.domain.Lesson;

import java.util.UUID;

public record LessonDto(
        UUID id,
        String title,
        String content,
        int position,
        Integer durationSecs
) {
    public static LessonDto from(Lesson l) {
        return new LessonDto(
                l.getId(),
                l.getTitle(),
                l.getContent(),
                l.getPosition(),
                l.getDurationSecs()
        );
    }
}
