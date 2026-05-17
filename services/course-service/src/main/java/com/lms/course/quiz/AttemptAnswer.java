package com.lms.course.quiz;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "attempt_answer")
public class AttemptAnswer {

    @Id @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", nullable = false)
    private Attempt attempt;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Object> response;

    @Column(name = "points_awarded", nullable = false)
    private int pointsAwarded = 0;

    @Column(nullable = false)
    private boolean correct = false;

    public UUID getId() { return id; }
    public Attempt getAttempt() { return attempt; }
    public void setAttempt(Attempt v) { this.attempt = v; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID v) { this.questionId = v; }
    public List<Object> getResponse() { return response; }
    public void setResponse(List<Object> v) { this.response = v; }
    public int getPointsAwarded() { return pointsAwarded; }
    public void setPointsAwarded(int v) { this.pointsAwarded = v; }
    public boolean isCorrect() { return correct; }
    public void setCorrect(boolean v) { this.correct = v; }
}
