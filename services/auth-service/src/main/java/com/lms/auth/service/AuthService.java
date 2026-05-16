package com.lms.auth.service;

import com.lms.auth.domain.AppUser;
import com.lms.auth.repository.AppUserRepository;
import com.lms.auth.web.dto.LoginRequest;
import com.lms.auth.web.dto.RegisterRequest;
import com.lms.auth.web.dto.TokenResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtIssuer issuer;

    public AuthService(AppUserRepository users, PasswordEncoder encoder, JwtIssuer issuer) {
        this.users = users; this.encoder = encoder; this.issuer = issuer;
    }

    public AppUser register(RegisterRequest req) {
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw new ConflictException("Email already registered");
        }
        AppUser u = new AppUser();
        u.setEmail(req.email().trim().toLowerCase());
        u.setDisplayName(req.displayName());
        u.setPasswordHash(encoder.encode(req.password()));
        return users.save(u);
    }

    public TokenResponse login(LoginRequest req) {
        AppUser u = users.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));
        if (u.getStatus() != AppUser.Status.ACTIVE) throw new UnauthorizedException("Account disabled");
        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        return new TokenResponse(issuer.issue(u), "Bearer", issuer.expirySeconds(), u.getId());
    }

    @Transactional(readOnly = true)
    public AppUser get(UUID id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
    }

    public static class NotFoundException extends RuntimeException { public NotFoundException(String m) { super(m); } }
    public static class ConflictException extends RuntimeException { public ConflictException(String m) { super(m); } }
    public static class UnauthorizedException extends RuntimeException { public UnauthorizedException(String m) { super(m); } }
}
