package com.lms.course.quiz;

import java.util.List;
import java.util.UUID;

/**
 * Question view DTO. If {@code includeCorrect} is false the {@code correct}
 * and {@code explanation} fields are stripped so the answer can be hidden
 * from learners while they're taking the quiz.
 */
public record QuestionDto(
        UUID id,
        QuestionType type,
        String prompt,
        List<String> options,
        List<Object> correct,
        int points,
        String explanation,
        String topic,
        int position
) {
    public static QuestionDto from(Question q, boolean includeCorrect) {
        return new QuestionDto(
                q.getId(),
                q.getType(),
                q.getPrompt(),
                q.getOptions(),
                includeCorrect ? q.getCorrect() : null,
                q.getPoints(),
                includeCorrect ? q.getExplanation() : null,
                q.getTopic(),
                q.getPosition()
        );
    }
}
