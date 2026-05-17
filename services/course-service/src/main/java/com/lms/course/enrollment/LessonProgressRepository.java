package com.lms.course.enrollment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {

    Optional<LessonProgress> findByUserIdAndLessonId(UUID userId, UUID lessonId);

    List<LessonProgress> findByUserIdAndCourseId(UUID userId, UUID courseId);

    long countByUserIdAndCourseIdAndStatus(UUID userId, UUID courseId, LessonProgressStatus status);
}
