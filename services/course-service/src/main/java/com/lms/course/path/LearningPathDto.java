package com.lms.course.path;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record LearningPathDto(
        UUID id,
        String title,
        String description,
        String summary,
        String coverColor,
        List<String> tags,
        LearningPathStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime publishedAt,
        int courseCount,
        List<PathCourseDto> courses
) {
    public record PathCourseDto(
            UUID linkId,
            UUID courseId,
            String courseTitle,
            String courseStatus,
            String courseSummary,
            int position,
            boolean required
    ) {
        public static PathCourseDto from(LearningPathCourse lpc) {
            var c = lpc.getCourse();
            return new PathCourseDto(
                    lpc.getId(),
                    c.getId(),
                    c.getTitle(),
                    c.getStatus().name(),
                    c.getSummary() != null ? c.getSummary() : c.getDescription(),
                    lpc.getPosition(),
                    lpc.isRequired());
        }
    }

    public static LearningPathDto summary(LearningPath p) {
        return new LearningPathDto(
                p.getId(), p.getTitle(), p.getDescription(), p.getSummary(),
                p.getCoverColor(), p.getTags(), p.getStatus(),
                p.getCreatedAt(), p.getUpdatedAt(), p.getPublishedAt(),
                p.getCourses().size(),
                List.of());
    }

    public static LearningPathDto full(LearningPath p) {
        return new LearningPathDto(
                p.getId(), p.getTitle(), p.getDescription(), p.getSummary(),
                p.getCoverColor(), p.getTags(), p.getStatus(),
                p.getCreatedAt(), p.getUpdatedAt(), p.getPublishedAt(),
                p.getCourses().size(),
                p.getCourses().stream().map(PathCourseDto::from).toList());
    }
}
