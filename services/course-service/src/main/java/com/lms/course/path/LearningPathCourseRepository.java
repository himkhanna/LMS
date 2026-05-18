package com.lms.course.path;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearningPathCourseRepository extends JpaRepository<LearningPathCourse, UUID> {
    List<LearningPathCourse> findByCourseId(UUID courseId);
}
