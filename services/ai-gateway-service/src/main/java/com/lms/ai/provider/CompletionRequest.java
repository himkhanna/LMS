package com.lms.ai.provider;

import java.util.List;

public record CompletionRequest(
        String model,
        List<Message> messages,
        Double temperature,
        Integer maxTokens
) {}
