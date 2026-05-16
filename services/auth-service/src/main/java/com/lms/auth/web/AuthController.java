package com.lms.auth.web;

import com.lms.auth.service.AuthService;
import com.lms.auth.web.dto.LoginRequest;
import com.lms.auth.web.dto.RegisterRequest;
import com.lms.auth.web.dto.TokenResponse;
import com.lms.auth.web.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final boolean localAccountsEnabled;

    private final AuthService service;

    public AuthController(AuthService service,
                          @Value("${app.auth.local-accounts.enabled:false}") boolean localAccountsEnabled) {
        this.service = service;
        this.localAccountsEnabled = localAccountsEnabled;
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest req) {
        if (!localAccountsEnabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return ResponseEntity.status(201).body(UserDto.from(service.register(req)));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        if (!localAccountsEnabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return service.login(req);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return UserDto.from(service.get(UUID.fromString(jwt.getSubject())));
    }
}
