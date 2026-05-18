package com.lms.course.path;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "learning_path")
public class LearningPath {

    @Id @UuidGenerator
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(length = 280)
    private String summary;

    @Column(name = "cover_color", length = 7)
    private String coverColor;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<String> tags = new ArrayList<>();

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private LearningPathStatus status = LearningPathStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @OneToMany(mappedBy = "path", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<LearningPathCourse> courses = new ArrayList<>();

    @PrePersist void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    @PreUpdate void onUpdate() { this.updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public String getSummary() { return summary; }
    public void setSummary(String v) { this.summary = v; }
    public String getCoverColor() { return coverColor; }
    public void setCoverColor(String v) { this.coverColor = v; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> v) { this.tags = v == null ? new ArrayList<>() : v; }
    public LearningPathStatus getStatus() { return status; }
    public void setStatus(LearningPathStatus v) { this.status = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public OffsetDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(OffsetDateTime v) { this.publishedAt = v; }
    public List<LearningPathCourse> getCourses() { return courses; }

    public void addCourse(LearningPathCourse lpc) {
        lpc.setPath(this);
        lpc.setPosition(courses.size());
        courses.add(lpc);
    }
}
