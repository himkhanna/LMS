package com.lms.auth.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class AppUser {

    public enum Role { USER, ADMIN, INSTRUCTOR }
    public enum Status { ACTIVE, DISABLED }

    @Id @UuidGenerator
    private UUID id;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "display_name")
    private String displayName;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private Role role = Role.USER;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private Status status = Status.ACTIVE;
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist void onCreate() { var n = OffsetDateTime.now(); this.createdAt = n; this.updatedAt = n; }
    @PreUpdate void onUpdate() { this.updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public String getEmail() { return email; } public void setEmail(String v) { this.email = v; }
    public String getPasswordHash() { return passwordHash; } public void setPasswordHash(String v) { this.passwordHash = v; }
    public String getDisplayName() { return displayName; } public void setDisplayName(String v) { this.displayName = v; }
    public Role getRole() { return role; } public void setRole(Role v) { this.role = v; }
    public Status getStatus() { return status; } public void setStatus(Status v) { this.status = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
