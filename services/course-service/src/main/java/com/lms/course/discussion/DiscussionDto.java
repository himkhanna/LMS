package com.lms.course.discussion;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DiscussionDto(
        UUID id,
        UUID courseId,
        UUID parentId,
        UUID authorUserId,
        String authorEmail,
        String authorName,
        String body,
        boolean pinned,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<DiscussionDto> replies
) {
    public static DiscussionDto from(DiscussionPost p, List<DiscussionDto> replies) {
        return new DiscussionDto(
                p.getId(), p.getCourseId(), p.getParentId(),
                p.getAuthorUserId(), p.getAuthorEmail(), p.getAuthorName(),
                p.getBody(), p.isPinned(),
                p.getCreatedAt(), p.getUpdatedAt(),
                replies);
    }
}
