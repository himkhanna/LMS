package com.lms.ai.web.dto;

import com.lms.ai.provider.Message;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CompletionApiRequest(
        UUID providerId,
        String model,
        @Valid @NotEmpty List<Message> messages,
        Double temperature,
        Integer maxTokens,
        @Size(max = 64) String useCase
) {}
