package com.lms.assessment.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quiz")
public class Quiz {
    public enum Status { DRAFT, PUBLISHED, ARCHIVED }

    @Id @UuidGenerator private UUID id;
    @Column(name = "course_id") private UUID courseId;
    @Column(nullable = false) private String title;
    @Column(columnDefinition = "text") private String description;
    @Column(name = "pass_score", nullable = false) private int passScore = 70;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private Status status = Status.DRAFT;
    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;
    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<Question> questions = new ArrayList<>();
    @PrePersist void c() { var n = OffsetDateTime.now(); createdAt = n; updatedAt = n; }
    @PreUpdate void u() { updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; } public void setCourseId(UUID v) { courseId = v; }
    public String getTitle() { return title; } public void setTitle(String v) { title = v; }
    public String getDescription() { return description; } public void setDescription(String v) { description = v; }
    public int getPassScore() { return passScore; } public void setPassScore(int v) { passScore = v; }
    public Status getStatus() { return status; } public void setStatus(Status v) { status = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public List<Question> getQuestions() { return questions; }
    public void addQuestion(Question q) { q.setQuiz(this); q.setPosition(questions.size()); questions.add(q); }
}
