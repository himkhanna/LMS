package com.lms.analytics.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "learning_event")
public class LearningEvent {
    @Id @UuidGenerator private UUID id;
    @Column(name = "user_id", nullable = false) private String userId;
    @Column(name = "event_type", nullable = false, length = 64) private String eventType;
    @Column(name = "course_id") private UUID courseId;
    @Column(name = "lesson_id") private UUID lessonId;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private Map<String, Object> payload;
    @Column(name = "occurred_at", nullable = false) private OffsetDateTime occurredAt;
    @PrePersist void c() { if (occurredAt == null) occurredAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getUserId() { return userId; } public void setUserId(String v) { userId = v; }
    public String getEventType() { return eventType; } public void setEventType(String v) { eventType = v; }
    public UUID getCourseId() { return courseId; } public void setCourseId(UUID v) { courseId = v; }
    public UUID getLessonId() { return lessonId; } public void setLessonId(UUID v) { lessonId = v; }
    public Map<String, Object> getPayload() { return payload; } public void setPayload(Map<String, Object> v) { payload = v; }
    public OffsetDateTime getOccurredAt() { return occurredAt; } public void setOccurredAt(OffsetDateTime v) { occurredAt = v; }
}
