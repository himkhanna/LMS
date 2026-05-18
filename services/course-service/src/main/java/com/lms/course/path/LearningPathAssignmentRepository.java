package com.lms.course.path;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearningPathAssignmentRepository extends JpaRepository<LearningPathAssignment, UUID> {
    Optional<LearningPathAssignment> findByPathIdAndUserId(UUID pathId, UUID userId);
    List<LearningPathAssignment> findByUserIdOrderByAssignedAtDesc(UUID userId);
    List<LearningPathAssignment> findByPathIdOrderByAssignedAtDesc(UUID pathId);
}
