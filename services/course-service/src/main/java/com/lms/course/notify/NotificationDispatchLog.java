package com.lms.course.notify;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Idempotency record: ensures the daily scheduler only emits one
 * notification per (enrollment, type, bucket). E.g. a "due in 7 days"
 * notification fires exactly once per enrollment, even if the cron runs
 * multiple times that day.
 */
@Entity
@Table(name = "notification_dispatch_log")
public class NotificationDispatchLog {

    @Id @UuidGenerator
    private UUID id;

    @Column(name = "enrollment_id", nullable = false)
    private UUID enrollmentId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private NotificationType type;

    @Column(nullable = false, length = 32)
    private String bucket;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist void onCreate() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(UUID v) { this.enrollmentId = v; }
    public NotificationType getType() { return type; }
    public void setType(NotificationType v) { this.type = v; }
    public String getBucket() { return bucket; }
    public void setBucket(String v) { this.bucket = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
