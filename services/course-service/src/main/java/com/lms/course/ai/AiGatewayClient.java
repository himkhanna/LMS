package com.lms.course.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Component
public class AiGatewayClient {

    private final WebClient webClient;

    public AiGatewayClient(@Value("${app.ai-gateway.base-url}") String baseUrl,
                           @Value("${app.ai-gateway.timeout-seconds:120}") int timeoutSeconds) {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
    }

    public CompletionResponse complete(CompletionRequest request, String bearerToken) {
        try {
            return webClient.post()
                    .uri("/api/v1/ai/completions")
                    .header("Authorization", "Bearer " + bearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(CompletionResponse.class)
                    .block(Duration.ofSeconds(180));
        } catch (WebClientResponseException e) {
            throw new AiGatewayException(
                    "AI gateway HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new AiGatewayException("AI gateway call failed: " + e.getMessage(), e);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CompletionRequest(
            UUID providerId,
            String model,
            List<Message> messages,
            Double temperature,
            Integer maxTokens,
            String useCase
    ) {}

    public record Message(String role, String content) {
        public static Message system(String c) { return new Message("system", c); }
        public static Message user(String c) { return new Message("user", c); }
    }

    public record CompletionResponse(
            String content,
            String model,
            Integer promptTokens,
            Integer completionTokens,
            Integer totalTokens
    ) {}
}
