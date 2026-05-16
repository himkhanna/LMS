package com.lms.user.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_profile")
public class UserProfile {
    @Id @UuidGenerator private UUID id;
    @Column(name = "auth_user_id", nullable = false, unique = true) private UUID authUserId;
    @Column(name = "display_name") private String displayName;
    @Column(columnDefinition = "text") private String bio;
    @Column(name = "avatar_url", length = 1024) private String avatarUrl;
    @Column(length = 16) private String locale = "en";
    @Column(length = 64) private String timezone = "UTC";
    @Column(name = "created_at", nullable = false, updatable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;
    @PrePersist void c() { var n = OffsetDateTime.now(); createdAt = n; updatedAt = n; }
    @PreUpdate void u() { updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public UUID getAuthUserId() { return authUserId; } public void setAuthUserId(UUID v) { authUserId = v; }
    public String getDisplayName() { return displayName; } public void setDisplayName(String v) { displayName = v; }
    public String getBio() { return bio; } public void setBio(String v) { bio = v; }
    public String getAvatarUrl() { return avatarUrl; } public void setAvatarUrl(String v) { avatarUrl = v; }
    public String getLocale() { return locale; } public void setLocale(String v) { locale = v; }
    public String getTimezone() { return timezone; } public void setTimezone(String v) { timezone = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
