package com.lms.aiorch.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "pipeline_run")
public class PipelineRun {
    public enum Status { PENDING, RUNNING, SUCCESS, ERROR }

    @Id @UuidGenerator private UUID id;
    @Column(nullable = false, length = 64) private String pipeline;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private Status status = Status.PENDING;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private Map<String, Object> input;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb") private Map<String, Object> output;
    @Column private String model;
    @Column(name = "provider_id") private UUID providerId;
    @Column(name = "user_id") private String userId;
    @Column(name = "error_message", columnDefinition = "text") private String errorMessage;
    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @Column(name = "completed_at") private OffsetDateTime completedAt;
    @PrePersist void c() { createdAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getPipeline() { return pipeline; } public void setPipeline(String v) { pipeline = v; }
    public Status getStatus() { return status; } public void setStatus(Status v) { status = v; }
    public Map<String, Object> getInput() { return input; } public void setInput(Map<String, Object> v) { input = v; }
    public Map<String, Object> getOutput() { return output; } public void setOutput(Map<String, Object> v) { output = v; }
    public String getModel() { return model; } public void setModel(String v) { model = v; }
    public UUID getProviderId() { return providerId; } public void setProviderId(UUID v) { providerId = v; }
    public String getUserId() { return userId; } public void setUserId(String v) { userId = v; }
    public String getErrorMessage() { return errorMessage; } public void setErrorMessage(String v) { errorMessage = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; } public void setCompletedAt(OffsetDateTime v) { completedAt = v; }
}
