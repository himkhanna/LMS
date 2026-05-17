package com.lms.course.enrollment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    Optional<Enrollment> findByCourseIdAndUserId(UUID courseId, UUID userId);

    @Query("""
            SELECT e FROM Enrollment e
            WHERE e.course.id = :courseId
              AND (:status IS NULL OR e.status = :status)
            ORDER BY e.assignedAt DESC
            """)
    Page<Enrollment> findByCourse(@Param("courseId") UUID courseId,
                                  @Param("status") EnrollmentStatus status,
                                  Pageable pageable);

    @Query("""
            SELECT e FROM Enrollment e
            WHERE e.userId = :userId
              AND (:status IS NULL OR e.status = :status)
            ORDER BY
                CASE WHEN e.dueAt IS NULL THEN 1 ELSE 0 END,
                e.dueAt ASC,
                e.assignedAt DESC
            """)
    List<Enrollment> findByUser(@Param("userId") UUID userId,
                                @Param("status") EnrollmentStatus status);

    long countByCourseIdAndStatus(UUID courseId, EnrollmentStatus status);
    long countByCourseId(UUID courseId);
}
