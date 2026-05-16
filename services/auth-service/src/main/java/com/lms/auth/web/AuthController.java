package com.lms.auth.web;

import com.lms.auth.service.AuthService;
import com.lms.auth.web.dto.LoginRequest;
import com.lms.auth.web.dto.RegisterRequest;
import com.lms.auth.web.dto.TokenResponse;
import com.lms.auth.web.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService service;
    private final boolean selfRegisterEnabled;

    public AuthController(AuthService service,
                          @Value("${app.auth.self-register.enabled:false}") boolean selfRegisterEnabled) {
        this.service = service;
        this.selfRegisterEnabled = selfRegisterEnabled;
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest req) {
        if (!selfRegisterEnabled) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return ResponseEntity.status(201).body(UserDto.from(service.register(req)));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        return service.login(req);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return UserDto.from(service.get(UUID.fromString(jwt.getSubject())));
    }
}
