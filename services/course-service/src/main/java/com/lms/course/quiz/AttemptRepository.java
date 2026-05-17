package com.lms.course.quiz;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AttemptRepository extends JpaRepository<Attempt, UUID> {
    List<Attempt> findByUserIdAndQuizIdOrderByStartedAtDesc(UUID userId, UUID quizId);
    List<Attempt> findByQuizIdOrderByStartedAtDesc(UUID quizId);
    long countByUserIdAndQuizId(UUID userId, UUID quizId);

    /**
     * Count distinct PUBLISHED quizzes in a course that the user has passed
     * at least once. Used to roll quiz completion into enrollment progress.
     */
    @Query("""
            SELECT COUNT(DISTINCT a.quizId)
            FROM Attempt a, Quiz q
            WHERE a.userId = :userId
              AND a.quizId = q.id
              AND q.course.id = :courseId
              AND q.status = com.lms.course.quiz.QuizStatus.PUBLISHED
              AND a.passed = true
            """)
    long countPassedPublishedQuizzesForUserAndCourse(@Param("userId") UUID userId,
                                                    @Param("courseId") UUID courseId);
}
