package com.lms.auth.web.dto;

import com.lms.auth.domain.AppUser;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserDto(UUID id, String email, String displayName, String role, String status,
                      OffsetDateTime createdAt) {
    public static UserDto from(AppUser u) {
        return new UserDto(u.getId(), u.getEmail(), u.getDisplayName(),
                u.getRole().name(), u.getStatus().name(), u.getCreatedAt());
    }
}
