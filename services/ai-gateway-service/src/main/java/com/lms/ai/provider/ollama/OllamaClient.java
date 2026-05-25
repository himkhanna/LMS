package com.lms.ai.provider.ollama;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lms.ai.domain.AiProvider;
import com.lms.ai.domain.ProviderType;
import com.lms.ai.provider.AiProviderClient;
import com.lms.ai.provider.CompletionRequest;
import com.lms.ai.provider.CompletionResponse;
import com.lms.ai.provider.ProviderException;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class OllamaClient implements AiProviderClient {

    private static final Logger log = LoggerFactory.getLogger(OllamaClient.class);

    private static final String DEFAULT_BASE = "http://localhost:11434";
    /** Local models on CPU can easily take 2–5 min for a structured JSON
     * response. Default to a generous read timeout; the call itself is
     * wrapped in a Mono.timeout that matches. */
    private static final Duration LONG_TIMEOUT = Duration.ofMinutes(8);

    private final WebClient.Builder webClientBuilder;

    public OllamaClient(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public ProviderType type() {
        return ProviderType.OLLAMA;
    }

    @Override
    public CompletionResponse complete(AiProvider provider, CompletionRequest request) {
        String model = request.model() != null ? request.model() : provider.getDefaultModel();
        if (model == null) throw new ProviderException("No model specified");
        String base = provider.getBaseUrl() != null && !provider.getBaseUrl().isBlank()
                ? provider.getBaseUrl()
                : DEFAULT_BASE;

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("stream", false);
        body.put("messages", request.messages().stream()
                .map(m -> Map.of("role", m.role(), "content", m.content()))
                .toList());
        Map<String, Object> options = new HashMap<>();
        if (request.temperature() != null) options.put("temperature", request.temperature());
        if (request.maxTokens() != null) options.put("num_predict", request.maxTokens());
        if (!options.isEmpty()) body.put("options", options);

        HttpClient httpClient = HttpClient.create()
                // Slow CPU inference often takes minutes; without these
                // timeouts the call would fail silently with a null message.
                .responseTimeout(LONG_TIMEOUT)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10_000)
                .doOnConnected(c -> c
                        .addHandlerLast(new ReadTimeoutHandler(LONG_TIMEOUT.toSeconds(), TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(30L, TimeUnit.SECONDS)));

        try {
            OllamaResponse resp = webClientBuilder
                    .clone()
                    .clientConnector(new ReactorClientHttpConnector(httpClient))
                    .build()
                    .post()
                    .uri(stripTrailingSlash(base) + "/api/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(OllamaResponse.class)
                    .timeout(LONG_TIMEOUT)
                    .block();
            if (resp == null || resp.message() == null) {
                throw new ProviderException("Ollama returned no message");
            }
            return new CompletionResponse(
                    resp.message().content(),
                    model,
                    resp.promptEvalCount(),
                    resp.evalCount(),
                    resp.promptEvalCount() != null && resp.evalCount() != null
                            ? resp.promptEvalCount() + resp.evalCount()
                            : null
            );
        } catch (WebClientResponseException e) {
            log.warn("Ollama HTTP {} from {}: {}", e.getStatusCode().value(), base, e.getResponseBodyAsString());
            throw new ProviderException("Ollama HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg == null || msg.isBlank()) msg = e.getClass().getSimpleName();
            log.warn("Ollama call to {} failed: {} ({})", base, msg, e.getClass().getName(), e);
            throw new ProviderException("Ollama call failed: " + msg + " [" + e.getClass().getSimpleName() + "]", e);
        }
    }

    private static String stripTrailingSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    record OllamaResponse(
            ChatMessage message,
            @JsonProperty("prompt_eval_count") Integer promptEvalCount,
            @JsonProperty("eval_count") Integer evalCount
    ) {}
    record ChatMessage(String role, String content) {}
}
