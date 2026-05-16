package com.lms.reporting.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "report")
public class Report {
    public enum Status { PENDING, RUNNING, SUCCESS, ERROR }

    @Id @UuidGenerator private UUID id;
    @Column(nullable = false, length = 64) private String type;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private Map<String, Object> params;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private Status status = Status.PENDING;
    @Column(name = "file_key", length = 512) private String fileKey;
    @Column private Integer rows;
    @Column(name = "requested_by") private String requestedBy;
    @Column(name = "error_message", columnDefinition = "text") private String errorMessage;
    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @Column(name = "completed_at") private OffsetDateTime completedAt;
    @PrePersist void c() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getType() { return type; } public void setType(String v) { type = v; }
    public Map<String, Object> getParams() { return params; } public void setParams(Map<String, Object> v) { params = v; }
    public Status getStatus() { return status; } public void setStatus(Status v) { status = v; }
    public String getFileKey() { return fileKey; } public void setFileKey(String v) { fileKey = v; }
    public Integer getRows() { return rows; } public void setRows(Integer v) { rows = v; }
    public String getRequestedBy() { return requestedBy; } public void setRequestedBy(String v) { requestedBy = v; }
    public String getErrorMessage() { return errorMessage; } public void setErrorMessage(String v) { errorMessage = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; } public void setCompletedAt(OffsetDateTime v) { completedAt = v; }
}
