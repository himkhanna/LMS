package com.lms.search.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "search_doc")
public class SearchDoc {
    @Id @UuidGenerator private UUID id;
    @Column(name = "entity_type", nullable = false, length = 64) private String entityType;
    @Column(name = "entity_id", nullable = false) private UUID entityId;
    @Column(nullable = false, length = 512) private String title;
    @Column(columnDefinition = "text") private String body;
    @JdbcTypeCode(SqlTypes.ARRAY) @Column(columnDefinition = "text[]") private String[] tags;
    @Column(name = "indexed_at", nullable = false) private OffsetDateTime indexedAt;
    @PrePersist @PreUpdate void touch() { indexedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getEntityType() { return entityType; } public void setEntityType(String v) { entityType = v; }
    public UUID getEntityId() { return entityId; } public void setEntityId(UUID v) { entityId = v; }
    public String getTitle() { return title; } public void setTitle(String v) { title = v; }
    public String getBody() { return body; } public void setBody(String v) { body = v; }
    public String[] getTags() { return tags; } public void setTags(String[] v) { tags = v; }
    public OffsetDateTime getIndexedAt() { return indexedAt; }
}
