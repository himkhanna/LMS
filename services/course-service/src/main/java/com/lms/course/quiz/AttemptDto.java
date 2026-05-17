package com.lms.course.quiz;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AttemptDto(
        UUID id,
        UUID quizId,
        UUID userId,
        String userEmail,
        String userName,
        OffsetDateTime startedAt,
        OffsetDateTime submittedAt,
        Integer score,
        Integer maxScore,
        Integer scorePct,
        Boolean passed,
        List<AnswerDto> answers
) {
    public static AttemptDto from(Attempt a) {
        return from(a, false);
    }

    public static AttemptDto from(Attempt a, boolean includeAnswers) {
        return new AttemptDto(
                a.getId(), a.getQuizId(), a.getUserId(), a.getUserEmail(), a.getUserName(),
                a.getStartedAt(), a.getSubmittedAt(),
                a.getScore(), a.getMaxScore(), a.getScorePct(), a.getPassed(),
                includeAnswers
                        ? a.getAnswers().stream().map(AnswerDto::from).toList()
                        : List.of()
        );
    }

    public record AnswerDto(
            UUID questionId,
            List<Object> response,
            int pointsAwarded,
            boolean correct
    ) {
        public static AnswerDto from(AttemptAnswer x) {
            return new AnswerDto(x.getQuestionId(), x.getResponse(), x.getPointsAwarded(), x.isCorrect());
        }
    }
}
