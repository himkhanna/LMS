package com.lms.course.enrollment;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "lesson_progress", uniqueConstraints = {
        @UniqueConstraint(name = "uk_lesson_progress_user_lesson", columnNames = {"user_id", "lesson_id"})
})
public class LessonProgress {

    @Id @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private LessonProgressStatus status = LessonProgressStatus.STARTED;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @PrePersist void onCreate() { if (startedAt == null) startedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID v) { this.userId = v; }
    public UUID getLessonId() { return lessonId; }
    public void setLessonId(UUID v) { this.lessonId = v; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID v) { this.courseId = v; }
    public LessonProgressStatus getStatus() { return status; }
    public void setStatus(LessonProgressStatus s) { this.status = s; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime v) { this.startedAt = v; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime v) { this.completedAt = v; }
}
