package com.lms.course.web.dto;

import com.lms.course.domain.Lesson;

import java.util.UUID;

public record LessonDto(
        UUID id,
        UUID moduleId,
        UUID courseId,
        String title,
        String content,
        int position,
        Integer durationSecs,
        String videoUrl,
        String videoProvider,
        String voiceOverText
) {
    public static LessonDto from(Lesson l) {
        return new LessonDto(
                l.getId(),
                l.getModule().getId(),
                l.getModule().getCourse().getId(),
                l.getTitle(),
                l.getContent(),
                l.getPosition(),
                l.getDurationSecs(),
                l.getVideoUrl(),
                l.getVideoProvider(),
                l.getVoiceOverText()
        );
    }
}
