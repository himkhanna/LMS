package com.lms.ai.provider.anthropic;

import com.fasterxml.jackson.annotation.JsonProperty;
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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AnthropicClient implements AiProviderClient {

    private static final String DEFAULT_BASE = "https://api.anthropic.com";
    private static final String DEFAULT_VERSION = "2023-06-01";
    private static final int DEFAULT_MAX_TOKENS = 1024;

    private final WebClient.Builder webClientBuilder;

    public AnthropicClient(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public ProviderType type() {
        return ProviderType.ANTHROPIC;
    }

    @Override
    public CompletionResponse complete(AiProvider provider, CompletionRequest request) {
        if (provider.getApiKey() == null) throw new ProviderException("Anthropic provider missing API key");
        String model = request.model() != null ? request.model() : provider.getDefaultModel();
        if (model == null) throw new ProviderException("No model specified");

        String systemPrompt = null;
        List<Map<String, Object>> messages = new ArrayList<>();
        for (Message m : request.messages()) {
            if ("system".equals(m.role())) {
                systemPrompt = systemPrompt == null ? m.content() : systemPrompt + "\n\n" + m.content();
            } else {
                messages.add(Map.of("role", m.role(), "content", m.content()));
            }
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("max_tokens", request.maxTokens() != null ? request.maxTokens() : DEFAULT_MAX_TOKENS);
        if (request.temperature() != null) body.put("temperature", request.temperature());
        if (systemPrompt != null) body.put("system", systemPrompt);

        String base = provider.getBaseUrl() != null && !provider.getBaseUrl().isBlank()
                ? provider.getBaseUrl()
                : DEFAULT_BASE;
        String version = provider.getConfig() != null && provider.getConfig().get("anthropic-version") instanceof String v && !v.isBlank()
                ? v
                : DEFAULT_VERSION;

        try {
            AnthropicMessagesResponse resp = webClientBuilder.build()
                    .post()
                    .uri(stripTrailingSlash(base) + "/v1/messages")
                    .header("x-api-key", provider.getApiKey())
                    .header("anthropic-version", version)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(AnthropicMessagesResponse.class)
                    .block();

            if (resp == null || resp.content() == null || resp.content().isEmpty()) {
                throw new ProviderException("Anthropic returned no content");
            }
            String content = resp.content().stream()
                    .filter(c -> "text".equals(c.type()))
                    .map(ContentBlock::text)
                    .reduce("", (a, b) -> a + b);
            Integer in = resp.usage() != null ? resp.usage().inputTokens() : null;
            Integer out = resp.usage() != null ? resp.usage().outputTokens() : null;
            Integer total = (in != null && out != null) ? in + out : null;
            return new CompletionResponse(content, model, in, out, total);
        } catch (WebClientResponseException e) {
            throw new ProviderException("Anthropic HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new ProviderException("Anthropic call failed: " + e.getMessage(), e);
        }
    }

    private static String stripTrailingSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    record AnthropicMessagesResponse(List<ContentBlock> content, Usage usage) {}
    record ContentBlock(String type, String text) {}
    record Usage(
            @JsonProperty("input_tokens") Integer inputTokens,
            @JsonProperty("output_tokens") Integer outputTokens
    ) {}
}
