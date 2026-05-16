package com.lms.ai.provider.azure;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lms.ai.domain.AiProvider;
import com.lms.ai.domain.ProviderType;
import com.lms.ai.provider.AiProviderClient;
import com.lms.ai.provider.CompletionRequest;
import com.lms.ai.provider.CompletionResponse;
import com.lms.ai.provider.ProviderException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AzureOpenAiClient implements AiProviderClient {

    private static final String DEFAULT_API_VERSION = "2024-08-01-preview";

    private final WebClient.Builder webClientBuilder;

    public AzureOpenAiClient(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public ProviderType type() {
        return ProviderType.AZURE_OPENAI;
    }

    @Override
    public CompletionResponse complete(AiProvider provider, CompletionRequest request) {
        if (provider.getApiKey() == null) throw new ProviderException("Azure OpenAI provider missing API key");
        if (provider.getBaseUrl() == null) throw new ProviderException("Azure OpenAI provider missing base URL");
        String deployment = request.model() != null ? request.model() : provider.getDefaultModel();
        if (deployment == null) throw new ProviderException("No deployment (model) specified");
        String apiVersion = config(provider, "api-version", DEFAULT_API_VERSION);

        Map<String, Object> body = new HashMap<>();
        body.put("messages", request.messages().stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList());
        if (request.temperature() != null) body.put("temperature", request.temperature());
        if (request.maxTokens() != null) body.put("max_tokens", request.maxTokens());

        String url = "%s/openai/deployments/%s/chat/completions?api-version=%s"
                .formatted(stripTrailingSlash(provider.getBaseUrl()), deployment, apiVersion);

        try {
            AzureChatResponse resp = webClientBuilder.build()
                    .post()
                    .uri(url)
                    .header("api-key", provider.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(AzureChatResponse.class)
                    .block();
            if (resp == null || resp.choices() == null || resp.choices().isEmpty()) {
                throw new ProviderException("Azure OpenAI returned no choices");
            }
            String content = resp.choices().get(0).message().content();
            Integer prompt = resp.usage() != null ? resp.usage().promptTokens() : null;
            Integer completion = resp.usage() != null ? resp.usage().completionTokens() : null;
            Integer total = resp.usage() != null ? resp.usage().totalTokens() : null;
            return new CompletionResponse(content, deployment, prompt, completion, total);
        } catch (WebClientResponseException e) {
            throw new ProviderException("Azure OpenAI HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new ProviderException("Azure OpenAI call failed: " + e.getMessage(), e);
        }
    }

    private static String stripTrailingSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private static String config(AiProvider p, String key, String fallback) {
        if (p.getConfig() != null && p.getConfig().get(key) instanceof String s && !s.isBlank()) return s;
        return fallback;
    }

    record AzureChatResponse(List<Choice> choices, Usage usage) {}
    record Choice(Message message) {}
    record Message(String role, String content) {}
    record Usage(
            @JsonProperty("prompt_tokens") Integer promptTokens,
            @JsonProperty("completion_tokens") Integer completionTokens,
            @JsonProperty("total_tokens") Integer totalTokens
    ) {}
}
