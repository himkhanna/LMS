package com.lms.notification.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "notification")
public class Notification {
    @Id @UuidGenerator private UUID id;
    @Column(name = "user_id", nullable = false) private String userId;
    @Column(nullable = false, length = 64) private String type;
    @Column(nullable = false) private String title;
    @Column(columnDefinition = "text") private String body;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private Map<String, Object> payload;
    @Column(name = "read_at") private OffsetDateTime readAt;
    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @PrePersist void c() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getUserId() { return userId; } public void setUserId(String v) { userId = v; }
    public String getType() { return type; } public void setType(String v) { type = v; }
    public String getTitle() { return title; } public void setTitle(String v) { title = v; }
    public String getBody() { return body; } public void setBody(String v) { body = v; }
    public Map<String, Object> getPayload() { return payload; } public void setPayload(Map<String, Object> v) { payload = v; }
    public OffsetDateTime getReadAt() { return readAt; } public void setReadAt(OffsetDateTime v) { readAt = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
