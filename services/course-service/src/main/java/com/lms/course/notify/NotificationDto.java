package com.lms.course.notify;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        UUID recipientUserId,
        String recipientEmail,
        NotificationChannel channel,
        NotificationType type,
        String subject,
        String body,
        UUID enrollmentId,
        UUID courseId,
        NotificationStatus status,
        String createdByEmail,
        OffsetDateTime createdAt,
        OffsetDateTime sentAt,
        OffsetDateTime readAt
) {
    public static NotificationDto from(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getRecipientUserId(),
                n.getRecipientEmail(),
                n.getChannel(),
                n.getType(),
                n.getSubject(),
                n.getBody(),
                n.getEnrollmentId(),
                n.getCourseId(),
                n.getStatus(),
                n.getCreatedByEmail(),
                n.getCreatedAt(),
                n.getSentAt(),
                n.getReadAt()
        );
    }
}
