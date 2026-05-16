package com.lms.auth.service;

import com.lms.auth.domain.AppUser;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Component
public class JwtIssuer {
    private final String secret;
    private final String issuer;
    private final long expirySeconds;

    public JwtIssuer(@Value("${app.jwt.secret}") String secret,
                     @Value("${app.jwt.issuer}") String issuer,
                     @Value("${app.jwt.expiry-seconds}") long expirySeconds) {
        this.secret = secret;
        this.issuer = issuer;
        this.expirySeconds = expirySeconds;
    }

    public String issue(AppUser user) {
        try {
            Instant now = Instant.now();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getId().toString())
                    .issuer(issuer)
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(now.plusSeconds(expirySeconds)))
                    .claim("email", user.getEmail())
                    .claim("name", user.getDisplayName())
                    .claim("roles", List.of("ROLE_" + user.getRole().name()))
                    .build();
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Failed to sign JWT", e);
        }
    }

    public long expirySeconds() { return expirySeconds; }
}
