package com.lms.course.discussion;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "discussion_post")
public class DiscussionPost {

    @Id @UuidGenerator
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    /** null = top-level post; set = reply to that post. */
    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "author_user_id", nullable = false)
    private UUID authorUserId;

    @Column(name = "author_email", nullable = false)
    private String authorEmail;

    @Column(name = "author_name")
    private String authorName;

    @Column(columnDefinition = "text", nullable = false)
    private String body;

    @Column(nullable = false)
    private boolean pinned = false;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    @PreUpdate void onUpdate() { this.updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID v) { this.courseId = v; }
    public UUID getParentId() { return parentId; }
    public void setParentId(UUID v) { this.parentId = v; }
    public UUID getAuthorUserId() { return authorUserId; }
    public void setAuthorUserId(UUID v) { this.authorUserId = v; }
    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String v) { this.authorEmail = v; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String v) { this.authorName = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public boolean isPinned() { return pinned; }
    public void setPinned(boolean v) { this.pinned = v; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(OffsetDateTime v) { this.deletedAt = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
