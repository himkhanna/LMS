package com.lms.auth.web.dto;

import com.lms.auth.domain.AppUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAdminRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 8, max = 255) String password,
        @NotBlank String displayName,
        AppUser.Role role,
        String managerEmail,
        String department
) {}
