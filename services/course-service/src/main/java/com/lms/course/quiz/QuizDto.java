package com.lms.course.quiz;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record QuizDto(
        UUID id,
        UUID courseId,
        UUID moduleId,
        UUID lessonId,
        String title,
        String description,
        int passScore,
        Integer timeLimitMins,
        Integer maxAttempts,
        boolean shuffleQuestions,
        QuizStatus status,
        int position,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        int totalQuestions,
        int totalPoints,
        List<QuestionDto> questions
) {
    public static QuizDto summary(Quiz q) {
        int totalPoints = q.getQuestions().stream().mapToInt(Question::getPoints).sum();
        return new QuizDto(
                q.getId(),
                q.getCourse().getId(),
                q.getModule() != null ? q.getModule().getId() : null,
                q.getLesson() != null ? q.getLesson().getId() : null,
                q.getTitle(),
                q.getDescription(),
                q.getPassScore(),
                q.getTimeLimitMins(),
                q.getMaxAttempts(),
                q.isShuffleQuestions(),
                q.getStatus(),
                q.getPosition(),
                q.getCreatedAt(),
                q.getUpdatedAt(),
                q.getQuestions().size(),
                totalPoints,
                List.of()
        );
    }

    public static QuizDto withQuestions(Quiz q, boolean includeAnswers) {
        QuizDto s = summary(q);
        List<QuestionDto> questions = q.getQuestions().stream()
                .map(it -> QuestionDto.from(it, includeAnswers))
                .toList();
        return new QuizDto(
                s.id(), s.courseId(), s.moduleId(), s.lessonId(),
                s.title(), s.description(), s.passScore(), s.timeLimitMins(),
                s.maxAttempts(), s.shuffleQuestions(), s.status(), s.position(),
                s.createdAt(), s.updatedAt(),
                s.totalQuestions(), s.totalPoints(),
                questions
        );
    }
}
