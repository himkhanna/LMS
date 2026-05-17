package com.lms.course.notify;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "notification")
public class Notification {

    @Id @UuidGenerator
    private UUID id;

    @Column(name = "recipient_user_id", nullable = false)
    private UUID recipientUserId;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private NotificationChannel channel = NotificationChannel.IN_APP;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private NotificationType type;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "text", nullable = false)
    private String body;

    @Column(name = "enrollment_id")
    private UUID enrollmentId;

    @Column(name = "course_id")
    private UUID courseId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private NotificationStatus status = NotificationStatus.PENDING;

    @Column(columnDefinition = "text")
    private String error;

    @Column(name = "created_by_email")
    private String createdByEmail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @PrePersist void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(UUID v) { this.recipientUserId = v; }
    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String v) { this.recipientEmail = v; }
    public NotificationChannel getChannel() { return channel; }
    public void setChannel(NotificationChannel v) { this.channel = v; }
    public NotificationType getType() { return type; }
    public void setType(NotificationType v) { this.type = v; }
    public String getSubject() { return subject; }
    public void setSubject(String v) { this.subject = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public UUID getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(UUID v) { this.enrollmentId = v; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID v) { this.courseId = v; }
    public NotificationStatus getStatus() { return status; }
    public void setStatus(NotificationStatus v) { this.status = v; }
    public String getError() { return error; }
    public void setError(String v) { this.error = v; }
    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String v) { this.createdByEmail = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getSentAt() { return sentAt; }
    public void setSentAt(OffsetDateTime v) { this.sentAt = v; }
    public OffsetDateTime getReadAt() { return readAt; }
    public void setReadAt(OffsetDateTime v) { this.readAt = v; }
}
