package com.lms.course.path;

import com.lms.course.enrollment.EnrollmentStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "learning_path_assignment", uniqueConstraints = {
        @UniqueConstraint(name = "uk_path_assignment_path_user", columnNames = {"path_id", "user_id"})
})
public class LearningPathAssignment {

    @Id @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "path_id", nullable = false)
    private LearningPath path;

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
    public LearningPath getPath() { return path; }
    public void setPath(LearningPath v) { this.path = v; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID v) { this.userId = v; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String v) { this.userEmail = v == null ? null : v.trim().toLowerCase(); }
    public String getUserName() { return userName; }
    public void setUserName(String v) { this.userName = v; }
    public String getManagerEmail() { return managerEmail; }
    public void setManagerEmail(String v) {
        this.managerEmail = v == null || v.isBlank() ? null : v.trim().toLowerCase();
    }
    public String getDepartment() { return department; }
    public void setDepartment(String v) { this.department = v == null || v.isBlank() ? null : v.trim(); }
    public EnrollmentStatus getStatus() { return status; }
    public void setStatus(EnrollmentStatus v) { this.status = v; }
    public boolean isMandatory() { return mandatory; }
    public void setMandatory(boolean v) { this.mandatory = v; }
    public String getAssignedByEmail() { return assignedByEmail; }
    public void setAssignedByEmail(String v) { this.assignedByEmail = v; }
    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public OffsetDateTime getDueAt() { return dueAt; }
    public void setDueAt(OffsetDateTime v) { this.dueAt = v; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime v) { this.startedAt = v; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime v) { this.completedAt = v; }
    public int getProgressPct() { return progressPct; }
    public void setProgressPct(int v) { this.progressPct = v; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
