package com.lms.ai.provider;

import com.lms.ai.domain.AiProvider;
import com.lms.ai.domain.ProviderType;

public interface AiProviderClient {

    ProviderType type();

    CompletionResponse complete(AiProvider provider, CompletionRequest request);
}
