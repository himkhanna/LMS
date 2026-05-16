package com.lms.ai.web.dto;

import java.util.Map;

public record UpdateProviderRequest(
        String name,
        String apiKey,
        String baseUrl,
        String defaultModel,
        Boolean enabled,
        Boolean isDefault,
        Integer priority,
        Map<String, Object> config
) {}
