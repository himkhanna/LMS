package com.lms.course.enrollment;

import com.lms.course.domain.Course;
import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "enrollment", uniqueConstraints = {
        @UniqueConstraint(name = "uk_enrollment_course_user", columnNames = {"course_id", "user_id"})
})
public class Enrollment {

    @Id @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "manager_email")
    private String managerEmail;

    @Column(name = "department", length = 128)
    private String department;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private EnrollmentStatus status = EnrollmentStatus.ASSIGNED;

    @Column(nullable = false)
    private boolean mandatory = false;

    @Column(name = "assigned_by_email")
    private String assignedByEmail;

    @Column(name = "assigned_at", nullable = false)
    private OffsetDateTime assignedAt;

    @Column(name = "due_at")
    private OffsetDateTime dueAt;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "progress_pct", nullable = false)
    private int progressPct = 0;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (assignedAt == null) assignedAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail == null ? null : userEmail.trim().toLowerCase();
    }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getManagerEmail() { return managerEmail; }
    public void setManagerEmail(String v) {
        this.managerEmail = v == null || v.isBlank() ? null : v.trim().toLowerCase();
    }
    public String getDepartment() { return department; }
    public void setDepartment(String v) {
        this.department = v == null || v.isBlank() ? null : v.trim();
    }
    public EnrollmentStatus getStatus() { return status; }
    public void setStatus(EnrollmentStatus status) { this.status = status; }
    public boolean isMandatory() { return mandatory; }
    public void setMandatory(boolean mandatory) { this.mandatory = mandatory; }
    public String getAssignedByEmail() { return assignedByEmail; }
    public void setAssignedByEmail(String v) { this.assignedByEmail = v; }
    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(OffsetDateTime v) { this.assignedAt = v; }
    public OffsetDateTime getDueAt() { return dueAt; }
    public void setDueAt(OffsetDateTime dueAt) { this.dueAt = dueAt; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime v) { this.startedAt = v; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime v) { this.completedAt = v; }
    public int getProgressPct() { return progressPct; }
    public void setProgressPct(int progressPct) { this.progressPct = progressPct; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
