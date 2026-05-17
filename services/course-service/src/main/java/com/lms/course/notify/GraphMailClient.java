package com.lms.course.notify;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Sends mail via Microsoft Graph {@code /users/{from}/sendMail}.
 *
 * <p>Uses the OAuth 2.0 client-credentials flow against the existing
 * Entra ID app registration (same tenant/client/secret as the OIDC
 * login flow). The app must have the <strong>application</strong>
 * permission {@code Mail.Send} granted with admin consent.
 *
 * <p>To restrict which mailbox(es) the app can send from, configure an
 * Application Access Policy in Exchange Online — Graph itself does not
 * scope this per-app.
 *
 * <p>Tokens are cached in-process until 60 s before their advertised
 * expiry to avoid re-authenticating per send.
 */
@Component
public class GraphMailClient {

    private static final Logger log = LoggerFactory.getLogger(GraphMailClient.class);
    private static final String GRAPH_BASE = "https://graph.microsoft.com/v1.0";

    private final WebClient web = WebClient.builder()
            .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
            .build();

    private final String tenantId;
    private final String clientId;
    private final String clientSecret;

    private volatile String cachedToken;
    private volatile Instant cachedTokenExpiresAt = Instant.EPOCH;

    public GraphMailClient(@Value("${app.notify.email.graph.tenant-id:${MS_TENANT_ID:}}") String tenantId,
                           @Value("${app.notify.email.graph.client-id:${MS_CLIENT_ID:}}") String clientId,
                           @Value("${app.notify.email.graph.client-secret:${MS_CLIENT_SECRET:}}") String clientSecret) {
        this.tenantId = tenantId;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public boolean configured() {
        return notBlank(tenantId) && notBlank(clientId) && notBlank(clientSecret);
    }

    /**
     * Send a plain-text mail as {@code from} to {@code to}.
     * Throws on hard failure so the notification record is marked FAILED.
     */
    public void send(String from, String to, String fromName, String subject, String body) {
        if (!configured()) {
            throw new IllegalStateException("Graph mail not configured (MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET)");
        }
        String token = acquireToken();
        SendMailRequest payload = new SendMailRequest(
                new Message(
                        subject,
                        new Body("Text", body),
                        List.of(new Recipient(new EmailAddress(to, null))),
                        notBlank(fromName) ? new Recipient(new EmailAddress(from, fromName)) : null),
                false);

        try {
            web.post()
                    .uri(GRAPH_BASE + "/users/{from}/sendMail", from)
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofSeconds(30));
        } catch (WebClientResponseException e) {
            log.warn("Graph sendMail failed: HTTP {} body={}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new RuntimeException("Graph sendMail HTTP " + e.getStatusCode().value()
                    + ": " + e.getResponseBodyAsString(), e);
        }
    }

    private synchronized String acquireToken() {
        Instant now = Instant.now();
        if (cachedToken != null && now.isBefore(cachedTokenExpiresAt.minusSeconds(60))) {
            return cachedToken;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("scope", "https://graph.microsoft.com/.default");

        try {
            TokenResponse resp = web.post()
                    .uri("https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token", tenantId)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(form))
                    .retrieve()
                    .bodyToMono(TokenResponse.class)
                    .block(Duration.ofSeconds(30));
            if (resp == null || resp.accessToken == null) {
                throw new RuntimeException("Empty token response from Entra ID");
            }
            cachedToken = resp.accessToken;
            cachedTokenExpiresAt = now.plusSeconds(resp.expiresIn != null ? resp.expiresIn : 3500);
            return cachedToken;
        } catch (WebClientResponseException e) {
            log.warn("Graph token request failed: HTTP {} body={}", e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to obtain Graph token: " + e.getResponseBodyAsString(), e);
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    // ---- payload DTOs ----

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record SendMailRequest(Message message,
                           @JsonProperty("saveToSentItems") boolean saveToSentItems) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Message(String subject, Body body,
                   List<Recipient> toRecipients,
                   Recipient from) {}

    record Body(String contentType, String content) {}

    record Recipient(EmailAddress emailAddress) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record EmailAddress(String address, String name) {}

    record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Integer expiresIn,
            @JsonProperty("token_type") String tokenType
    ) {}
}
