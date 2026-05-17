package com.lms.auth.service;

import com.lms.auth.domain.AppUser;
import com.lms.auth.microsoft.MicrosoftOidcService.IdTokenClaims;
import com.lms.auth.repository.AppUserRepository;
import com.lms.auth.web.dto.CreateAdminRequest;
import com.lms.auth.web.dto.LoginRequest;
import com.lms.auth.web.dto.RegisterRequest;
import com.lms.auth.web.dto.ResetPasswordRequest;
import com.lms.auth.web.dto.TokenResponse;
import com.lms.auth.web.dto.UpdateUserRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    public TokenResponse loginViaMicrosoft(IdTokenClaims claims) {
        AppUser u = users.findByMicrosoftOid(claims.oid())
                .or(() -> users.findByEmailIgnoreCase(claims.email()))
                .orElseGet(AppUser::new);
        boolean isNew = u.getId() == null;
        u.setMicrosoftOid(claims.oid());
        u.setTenantId(claims.tenantId());
        u.setEmail(claims.email().toLowerCase());
        if (isNew || u.getDisplayName() == null) u.setDisplayName(claims.displayName());
        if (u.getStatus() == null) u.setStatus(AppUser.Status.ACTIVE);
        if (u.getRole() == null) u.setRole(AppUser.Role.USER);
        AppUser saved = users.save(u);
        return new TokenResponse(issuer.issue(saved), "Bearer", issuer.expirySeconds(), saved.getId());
    }

    // ---- Admin user management ----

    @Transactional(readOnly = true)
    public Page<AppUser> adminList(AppUser.Role role, AppUser.Status status, String q, Pageable pageable) {
        return users.adminSearch(role, status, q == null || q.isBlank() ? null : "%" + q.toLowerCase() + "%", pageable);
    }

    public AppUser adminCreate(CreateAdminRequest req) {
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw new ConflictException("Email already registered");
        }
        AppUser u = new AppUser();
        u.setEmail(req.email().trim().toLowerCase());
        u.setDisplayName(req.displayName());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole(req.role() != null ? req.role() : AppUser.Role.ADMIN);
        u.setStatus(AppUser.Status.ACTIVE);
        if (req.managerEmail() != null && !req.managerEmail().isBlank()) {
            u.setManagerEmail(req.managerEmail());
        }
        if (req.department() != null && !req.department().isBlank()) {
            u.setDepartment(req.department().trim());
        }
        return users.save(u);
    }

    public AppUser adminUpdate(UUID id, UpdateUserRequest req) {
        AppUser u = get(id);
        if (req.displayName() != null) u.setDisplayName(req.displayName());
        if (req.role() != null) u.setRole(req.role());
        if (req.status() != null) u.setStatus(req.status());
        if (req.managerEmail() != null) {
            u.setManagerEmail(req.managerEmail().isBlank() ? null : req.managerEmail());
        }
        if (req.department() != null) {
            u.setDepartment(req.department().isBlank() ? null : req.department().trim());
        }
        return u;
    }

    public void adminResetPassword(UUID id, ResetPasswordRequest req) {
        AppUser u = get(id);
        u.setPasswordHash(encoder.encode(req.newPassword()));
    }

    public void adminDelete(UUID id) {
        if (!users.existsById(id)) throw new NotFoundException("User not found");
        users.deleteById(id);
    }

    public static class NotFoundException extends RuntimeException { public NotFoundException(String m) { super(m); } }
    public static class ConflictException extends RuntimeException { public ConflictException(String m) { super(m); } }
    public static class UnauthorizedException extends RuntimeException { public UnauthorizedException(String m) { super(m); } }
}
