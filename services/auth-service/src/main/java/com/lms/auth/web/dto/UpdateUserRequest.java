package com.lms.auth.web.dto;

import com.lms.auth.domain.AppUser;

public record UpdateUserRequest(String displayName, AppUser.Role role, AppUser.Status status) {}
