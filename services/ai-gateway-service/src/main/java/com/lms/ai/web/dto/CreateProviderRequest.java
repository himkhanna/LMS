package com.lms.ai.web.dto;

import com.lms.ai.domain.ProviderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record CreateProviderRequest(
        @NotNull ProviderType providerType,
        @NotBlank String name,
        String apiKey,
        String baseUrl,
        String defaultModel,
        Boolean enabled,
        Boolean isDefault,
        Integer priority,
        Map<String, Object> config
) {}
