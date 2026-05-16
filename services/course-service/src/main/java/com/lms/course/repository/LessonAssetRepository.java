package com.lms.course.repository;

import com.lms.course.domain.LessonAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonAssetRepository extends JpaRepository<LessonAsset, UUID> {
    List<LessonAsset> findByLessonId(UUID lessonId);
}
