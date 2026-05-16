package com.lms.auth.web;

import com.lms.auth.microsoft.MicrosoftOidcService;
import com.lms.auth.service.AuthService;
import com.lms.auth.web.dto.TokenResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/microsoft")
public class MicrosoftAuthController {

    private final MicrosoftOidcService oidc;
    private final AuthService auth;

    public MicrosoftAuthController(MicrosoftOidcService oidc, AuthService auth) {
        this.oidc = oidc;
        this.auth = auth;
    }

    @PostMapping("/callback")
    public TokenResponse callback(@Valid @RequestBody CallbackRequest req) {
        var claims = oidc.exchangeAndValidate(req.code(), req.redirectUri());
        return auth.loginViaMicrosoft(claims);
    }

    public record CallbackRequest(@NotBlank String code, @NotBlank String redirectUri) {}
}
