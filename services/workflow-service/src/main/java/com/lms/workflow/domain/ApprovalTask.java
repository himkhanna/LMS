package com.lms.workflow.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "approval_task")
public class ApprovalTask {
    public enum Status { PENDING, APPROVED, REJECTED, CANCELLED }

    @Id @UuidGenerator private UUID id;
    @Column(name = "entity_type", nullable = false, length = 64) private String entityType;
    @Column(name = "entity_id", nullable = false) private UUID entityId;
    @Column(nullable = false, length = 64) private String action;
    @Column(name = "requester_id", nullable = false) private String requesterId;
    @Column(name = "approver_id") private String approverId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private Status status = Status.PENDING;
    @Column(columnDefinition = "text") private String comment;
    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @Column(name = "decided_at") private OffsetDateTime decidedAt;
    @PrePersist void c() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getEntityType() { return entityType; } public void setEntityType(String v) { entityType = v; }
    public UUID getEntityId() { return entityId; } public void setEntityId(UUID v) { entityId = v; }
    public String getAction() { return action; } public void setAction(String v) { action = v; }
    public String getRequesterId() { return requesterId; } public void setRequesterId(String v) { requesterId = v; }
    public String getApproverId() { return approverId; } public void setApproverId(String v) { approverId = v; }
    public Status getStatus() { return status; } public void setStatus(Status v) { status = v; }
    public String getComment() { return comment; } public void setComment(String v) { comment = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getDecidedAt() { return decidedAt; } public void setDecidedAt(OffsetDateTime v) { decidedAt = v; }
}
