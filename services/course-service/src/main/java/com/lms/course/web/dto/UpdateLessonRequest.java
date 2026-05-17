package com.lms.course.web.dto;

public record UpdateLessonRequest(
        String title,
        String content,
        Integer durationSecs
) {}
