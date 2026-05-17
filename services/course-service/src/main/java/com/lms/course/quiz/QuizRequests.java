package com.lms.course.quiz;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class QuizRequests {
    private QuizRequests() {}

    public record CreateQuiz(
            @NotBlank String title,
            String description,
            UUID moduleId,
            UUID lessonId,
            @Min(0) Integer passScore,
            Integer timeLimitMins,
            Integer maxAttempts,
            Boolean shuffleQuestions
    ) {}

    public record UpdateQuiz(
            String title,
            String description,
            UUID moduleId,
            UUID lessonId,
            Integer passScore,
            Integer timeLimitMins,
            Integer maxAttempts,
            Boolean shuffleQuestions,
            QuizStatus status
    ) {}

    public record CreateQuestion(
            @NotNull QuestionType type,
            @NotBlank String prompt,
            List<String> options,
            @NotNull List<Object> correct,
            Integer points,
            String explanation
    ) {}

    public record UpdateQuestion(
            QuestionType type,
            String prompt,
            List<String> options,
            List<Object> correct,
            Integer points,
            String explanation
    ) {}

    /** Map of question UUID -> response array. */
    public record SubmitAttempt(@NotNull Map<UUID, List<Object>> answers) {}

    public record GenerateQuiz(
            UUID lessonId,
            UUID moduleId,
            Integer questionCount,
            List<QuestionType> types,
            String difficulty,
            UUID providerId,
            String model,
            Integer maxTokens
    ) {}
}
