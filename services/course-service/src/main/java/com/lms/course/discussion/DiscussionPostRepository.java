package com.lms.course.discussion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DiscussionPostRepository extends JpaRepository<DiscussionPost, UUID> {

    @Query("""
            SELECT p FROM DiscussionPost p
            WHERE p.courseId = :courseId
              AND p.parentId IS NULL
              AND p.deletedAt IS NULL
            ORDER BY p.pinned DESC, p.createdAt DESC
            """)
    List<DiscussionPost> findTopLevel(@Param("courseId") UUID courseId);

    @Query("""
            SELECT p FROM DiscussionPost p
            WHERE p.parentId IN :parentIds
              AND p.deletedAt IS NULL
            ORDER BY p.createdAt ASC
            """)
    List<DiscussionPost> findRepliesForParents(@Param("parentIds") List<UUID> parentIds);
}
