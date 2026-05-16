package com.lms.ai.web;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/dev/auth")
@ConditionalOnProperty(name = "app.dev-auth.enabled", havingValue = "true", matchIfMissing = true)
public class DevAuthController {

    private final String secret;

    public DevAuthController(@Value("${app.jwt.secret}") String secret) {
        this.secret = secret;
    }

    @PostMapping("/login")
    public TokenResponse login(@RequestBody LoginRequest req) throws JOSEException {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(req.username())
                .issuer("ai-gateway-dev")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(60 * 60 * 8)))
                .claim("roles", List.of("ROLE_USER", "ROLE_ADMIN"))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
        return new TokenResponse(jwt.serialize(), "Bearer", 60 * 60 * 8);
    }

    public record LoginRequest(@NotBlank String username) {}
    public record TokenResponse(String accessToken, String tokenType, long expiresInSeconds) {}
}
