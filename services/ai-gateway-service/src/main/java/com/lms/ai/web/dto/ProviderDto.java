package com.lms.ai.web.dto;

import com.lms.ai.domain.AiProvider;
import com.lms.ai.domain.ProviderType;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record ProviderDto(
        UUID id,
        ProviderType providerType,
        String name,
        boolean enabled,
        boolean isDefault,
        boolean apiKeySet,
        String apiKeyPreview,
        String baseUrl,
        String defaultModel,
        int priority,
        Map<String, Object> config,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static ProviderDto from(AiProvider p) {
        boolean hasKey = p.getApiKey() != null && !p.getApiKey().isBlank();
        String preview = null;
        if (hasKey) {
            String k = p.getApiKey();
            preview = k.length() <= 8 ? "****" : k.substring(0, 4) + "…" + k.substring(k.length() - 4);
        }
        return new ProviderDto(
                p.getId(),
                p.getProviderType(),
                p.getName(),
                p.isEnabled(),
                p.isDefault(),
                hasKey,
                preview,
                p.getBaseUrl(),
                p.getDefaultModel(),
                p.getPriority(),
                p.getConfig(),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
