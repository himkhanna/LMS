package com.lms.auth.microsoft;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTClaimsVerifier;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class MicrosoftOidcService {

    private final MicrosoftOidcProperties props;
    private final HttpClient http;
    private final ObjectMapper json;

    public MicrosoftOidcService(MicrosoftOidcProperties props, ObjectMapper json) {
        this.props = props;
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    /**
     * Exchanges the OAuth authorization code for an id_token and validates it.
     *
     * @param codeVerifier the PKCE verifier the SPA stored before redirecting
     *                     to Entra; required when the SPA sent a
     *                     {@code code_challenge}. Pass {@code null} only for
     *                     legacy non-PKCE flows.
     */
    public IdTokenClaims exchangeAndValidate(String code, String redirectUri, String codeVerifier) {
        List<String> form = new ArrayList<>(List.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", redirectUri,
                "client_id", props.getClientId(),
                "client_secret", props.getClientSecret(),
                "scope", "openid profile email"
        ));
        if (codeVerifier != null && !codeVerifier.isBlank()) {
            form.add("code_verifier");
            form.add(codeVerifier);
        }
        String body = formEncode(form.toArray(new String[0]));
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(props.tokenEndpoint()))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        try {
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                throw new MicrosoftAuthException("token exchange failed: HTTP " + resp.statusCode() + " " + resp.body());
            }
            JsonNode tree = json.readTree(resp.body());
            String idToken = optText(tree, "id_token");
            if (idToken == null) throw new MicrosoftAuthException("no id_token in response");
            return validate(idToken);
        } catch (MicrosoftAuthException e) {
            throw e;
        } catch (Exception e) {
            throw new MicrosoftAuthException("token exchange error: " + e.getMessage(), e);
        }
    }

    private IdTokenClaims validate(String idToken) {
        try {
            SignedJWT jwt = SignedJWT.parse(idToken);
            String tid = (String) jwt.getJWTClaimsSet().getClaim("tid");
            if (tid == null) throw new MicrosoftAuthException("id_token missing tid claim");

            JWKSource<SecurityContext> jwks = JWKSourceBuilder.create(new java.net.URL(props.jwksUri(tid))).build();
            JWSKeySelector<SecurityContext> selector = new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, jwks);
            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(selector);
            processor.setJWTClaimsSetVerifier(new DefaultJWTClaimsVerifier<>(
                    new JWTClaimsSet.Builder()
                            .issuer(props.expectedIssuer(tid))
                            .audience(props.getClientId())
                            .build(),
                    Set.of("sub", "iat", "exp", "tid")
            ));
            JWTClaimsSet claims = processor.process(jwt, null);

            String oid = (String) claims.getClaim("oid");
            String email = (String) claims.getClaim("email");
            if (email == null) email = (String) claims.getClaim("preferred_username");
            String name = (String) claims.getClaim("name");
            List<String> roles = readStringList(claims, "roles");
            List<String> groups = readStringList(claims, "groups");

            if (oid == null || oid.isBlank()) throw new MicrosoftAuthException("id_token missing oid");
            if (email == null || email.isBlank()) throw new MicrosoftAuthException("id_token missing email/preferred_username");
            return new IdTokenClaims(oid, tid, email, name, roles, groups);
        } catch (MicrosoftAuthException e) {
            throw e;
        } catch (Exception e) {
            throw new MicrosoftAuthException("id_token validation failed: " + e.getMessage(), e);
        }
    }

    private static List<String> readStringList(JWTClaimsSet claims, String name) {
        Object raw = claims.getClaim(name);
        if (raw == null) return List.of();
        if (raw instanceof List<?> list) {
            List<String> out = new ArrayList<>(list.size());
            for (Object o : list) {
                if (o != null) out.add(String.valueOf(o));
            }
            return out;
        }
        return List.of(String.valueOf(raw));
    }

    private static String formEncode(String... kv) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < kv.length; i += 2) {
            if (sb.length() > 0) sb.append('&');
            sb.append(URLEncoder.encode(kv[i], StandardCharsets.UTF_8));
            sb.append('=');
            sb.append(URLEncoder.encode(kv[i + 1], StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private static String optText(JsonNode n, String f) {
        JsonNode v = n.get(f);
        return v == null || v.isNull() ? null : v.asText();
    }

    public record IdTokenClaims(
            String oid,
            String tenantId,
            String email,
            String displayName,
            List<String> roles,
            List<String> groups
    ) {}
}
