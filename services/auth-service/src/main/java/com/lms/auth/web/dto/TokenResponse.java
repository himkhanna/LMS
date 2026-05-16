package com.lms.auth.web.dto;

import java.util.UUID;

public record TokenResponse(String accessToken, String tokenType, long expiresInSeconds, UUID userId) {}
