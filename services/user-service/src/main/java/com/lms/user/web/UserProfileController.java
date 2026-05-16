package com.lms.user.web;

import com.lms.user.domain.UserProfile;
import com.lms.user.repository.UserProfileRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class UserProfileController {

    private final UserProfileRepository profiles;

    public UserProfileController(UserProfileRepository profiles) { this.profiles = profiles; }

    @GetMapping("/me/profile")
    public UserProfile myProfile(@AuthenticationPrincipal Jwt jwt) {
        UUID id = UUID.fromString(jwt.getSubject());
        return profiles.findByAuthUserId(id).orElseGet(() -> {
            UserProfile p = new UserProfile();
            p.setAuthUserId(id);
            p.setDisplayName(jwt.getClaimAsString("name"));
            return profiles.save(p);
        });
    }

    @PatchMapping("/me/profile")
    public UserProfile updateMyProfile(@AuthenticationPrincipal Jwt jwt,
                                       @Valid @RequestBody UpdateProfile req) {
        UserProfile p = myProfile(jwt);
        if (req.displayName() != null) p.setDisplayName(req.displayName());
        if (req.bio() != null) p.setBio(req.bio());
        if (req.avatarUrl() != null) p.setAvatarUrl(req.avatarUrl());
        if (req.locale() != null) p.setLocale(req.locale());
        if (req.timezone() != null) p.setTimezone(req.timezone());
        return p;
    }

    @GetMapping("/users/{authUserId}/profile")
    public ResponseEntity<UserProfile> byUser(@PathVariable UUID authUserId) {
        return profiles.findByAuthUserId(authUserId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record UpdateProfile(String displayName, String bio, String avatarUrl,
                                String locale, String timezone) {}
}
