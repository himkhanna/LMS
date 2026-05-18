package com.lms.course.path;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearningPathRepository extends JpaRepository<LearningPath, UUID> {
    List<LearningPath> findAllByOrderByUpdatedAtDesc();
    List<LearningPath> findByStatusOrderByPublishedAtDesc(LearningPathStatus status);
}
