package com.lms.course.certificate;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "certificate")
public class Certificate {

    @Id @UuidGenerator
    private UUID id;

    @Column(name = "enrollment_id", nullable = false, unique = true)
    private UUID enrollmentId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "course_title", nullable = false)
    private String courseTitle;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private OffsetDateTime issuedAt;

    @Column(nullable = false, unique = true, length = 64)
    private String serial;

    @PrePersist void onCreate() {
        if (issuedAt == null) issuedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(UUID v) { this.enrollmentId = v; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID v) { this.userId = v; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String v) { this.userEmail = v; }
    public String getUserName() { return userName; }
    public void setUserName(String v) { this.userName = v; }
    public UUID getCourseId() { return courseId; }
    public void setCourseId(UUID v) { this.courseId = v; }
    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String v) { this.courseTitle = v; }
    public OffsetDateTime getIssuedAt() { return issuedAt; }
    public String getSerial() { return serial; }
    public void setSerial(String v) { this.serial = v; }
}
