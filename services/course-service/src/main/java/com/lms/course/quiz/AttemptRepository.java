package com.lms.course.quiz;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttemptRepository extends JpaRepository<Attempt, UUID> {
    List<Attempt> findByUserIdAndQuizIdOrderByStartedAtDesc(UUID userId, UUID quizId);
    List<Attempt> findByQuizIdOrderByStartedAtDesc(UUID quizId);
    long countByUserIdAndQuizId(UUID userId, UUID quizId);
}
