package com.lms.course.quiz;

import java.util.List;
import java.util.UUID;

public record QuestionAnalytics(
        UUID questionId,
        QuestionType type,
        String prompt,
        int position,
        int totalResponses,
        int correctResponses,
        double correctPct,
        /** For MCQ_* : how many learners picked each option index. null otherwise. */
        List<Integer> optionPickCounts
) {}
