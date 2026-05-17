package com.lms.course.quiz;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "attempt")
public class Attempt {

    @Id @UuidGenerator
    private UUID id;

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column
    private Integer score;

    @Column(name = "max_score")
    private Integer maxScore;

    @Column(name = "score_pct")
    private Integer scorePct;

    @Column
    private Boolean passed;

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AttemptAnswer> answers = new ArrayList<>();

    @PrePersist void onCreate() {
        if (startedAt == null) startedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public void setQuizId(UUID v) { this.quizId = v; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID v) { this.userId = v; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String v) { this.userEmail = v; }
    public String getUserName() { return userName; }
    public void setUserName(String v) { this.userName = v; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public OffsetDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(OffsetDateTime v) { this.submittedAt = v; }
    public Integer getScore() { return score; }
    public void setScore(Integer v) { this.score = v; }
    public Integer getMaxScore() { return maxScore; }
    public void setMaxScore(Integer v) { this.maxScore = v; }
    public Integer getScorePct() { return scorePct; }
    public void setScorePct(Integer v) { this.scorePct = v; }
    public Boolean getPassed() { return passed; }
    public void setPassed(Boolean v) { this.passed = v; }
    public List<AttemptAnswer> getAnswers() { return answers; }

    public void addAnswer(AttemptAnswer a) {
        a.setAttempt(this);
        answers.add(a);
    }
}
