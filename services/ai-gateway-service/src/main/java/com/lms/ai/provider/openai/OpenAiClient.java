package com.lms.ai.provider.openai;

import com.lms.ai.domain.AiProvider;
import com.lms.ai.domain.ProviderType;
import com.lms.ai.provider.AiProviderClient;
import com.lms.ai.provider.CompletionRequest;
import com.lms.ai.provider.CompletionResponse;
import com.lms.ai.provider.Message;
import com.lms.ai.provider.ProviderException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiClient implements AiProviderClient {

    private static final String DEFAULT_BASE = "https://api.openai.com";

    private final WebClient.Builder webClientBuilder;

    public OpenAiClient(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public ProviderType type() {
        return ProviderType.OPENAI;
    }

    @Override
    public CompletionResponse complete(AiProvider provider, CompletionRequest request) {
        if (provider.getApiKey() == null || provider.getApiKey().isBlank()) {
            throw new ProviderException("OpenAI provider " + provider.getName() + " has no API key");
        }
        String model = request.model() != null ? request.model() : provider.getDefaultModel();
        if (model == null) throw new ProviderException("No model specified");

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", request.messages().stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList());
        if (request.temperature() != null) body.put("temperature", request.temperature());
        if (request.maxTokens() != null) body.put("max_tokens", request.maxTokens());

        String base = provider.getBaseUrl() != null && !provider.getBaseUrl().isBlank()
                ? provider.getBaseUrl()
                : DEFAULT_BASE;

        try {
            OpenAiChatResponse resp = webClientBuilder.build()
                    .post()
                    .uri(base + "/v1/chat/completions")
                    .header("Authorization", "Bearer " + provider.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(OpenAiChatResponse.class)
                    .block();

            if (resp == null || resp.choices() == null || resp.choices().isEmpty()) {
                throw new ProviderException("OpenAI returned no choices");
            }
            String content = resp.choices().get(0).message().content();
            Integer prompt = resp.usage() != null ? resp.usage().promptTokens() : null;
            Integer completion = resp.usage() != null ? resp.usage().completionTokens() : null;
            Integer total = resp.usage() != null ? resp.usage().totalTokens() : null;
            return new CompletionResponse(content, model, prompt, completion, total);
        } catch (WebClientResponseException e) {
            throw new ProviderException("OpenAI HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new ProviderException("OpenAI call failed: " + e.getMessage(), e);
        }
    }

    record OpenAiChatResponse(List<Choice> choices, Usage usage) {}
    record Choice(Message message) {}
    record Message(String role, String content) {}
    record Usage(
            @com.fasterxml.jackson.annotation.JsonProperty("prompt_tokens") Integer promptTokens,
            @com.fasterxml.jackson.annotation.JsonProperty("completion_tokens") Integer completionTokens,
            @com.fasterxml.jackson.annotation.JsonProperty("total_tokens") Integer totalTokens
    ) {}
}
