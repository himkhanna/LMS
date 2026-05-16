package com.lms.course.web.dto;

import com.lms.course.domain.LessonAsset;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AssetDto(
        UUID id,
        UUID lessonId,
        String storageKey,
        String contentType,
        Long sizeBytes,
        String originalName,
        String url,
        OffsetDateTime createdAt
) {
    public static AssetDto from(LessonAsset a, String url) {
        return new AssetDto(
                a.getId(),
                a.getLesson().getId(),
                a.getStorageKey(),
                a.getContentType(),
                a.getSizeBytes(),
                a.getOriginalName(),
                url,
                a.getCreatedAt()
        );
    }
}
