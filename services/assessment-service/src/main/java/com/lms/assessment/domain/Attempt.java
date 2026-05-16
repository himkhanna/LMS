package com.lms.assessment.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attempt")
public class Attempt {
    @Id @UuidGenerator private UUID id;
    @Column(name = "quiz_id", nullable = false) private UUID quizId;
    @Column(name = "user_id", nullable = false) private String userId;
    @Column(name = "started_at", nullable = false) private OffsetDateTime startedAt;
    @Column(name = "submitted_at") private OffsetDateTime submittedAt;
    @Column private Integer score;
    @Column private Boolean passed;
    @PrePersist void c() { startedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; } public void setQuizId(UUID v) { quizId = v; }
    public String getUserId() { return userId; } public void setUserId(String v) { userId = v; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; } public void setSubmittedAt(OffsetDateTime v) { submittedAt = v; }
    public Integer getScore() { return score; } public void setScore(Integer v) { score = v; }
    public Boolean getPassed() { return passed; } public void setPassed(Boolean v) { passed = v; }
}
