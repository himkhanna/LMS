package com.lms.ai.provider;

public record CompletionResponse(
        String content,
        String model,
        Integer promptTokens,
        Integer completionTokens,
        Integer totalTokens
) {}
