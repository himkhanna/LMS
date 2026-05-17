package com.lms.course.notify;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    // ---- Learner inbox ----

    @GetMapping("/me/notifications")
    public List<NotificationDto> mine(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "50") int size,
                                      @AuthenticationPrincipal Jwt jwt) {
        UUID userId = currentUserId(jwt);
        return service.listForUser(userId, PageRequest.of(page, Math.min(size, 200)))
                .map(NotificationDto::from)
                .getContent();
    }

    @GetMapping("/me/notifications/unread-count")
    public UnreadResponse unreadCount(@AuthenticationPrincipal Jwt jwt) {
        return new UnreadResponse(service.unreadCount(currentUserId(jwt)));
    }

    @PostMapping("/me/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        service.markRead(id, currentUserId(jwt));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/notifications/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal Jwt jwt) {
        service.markAllRead(currentUserId(jwt));
        return ResponseEntity.noContent().build();
    }

    // ---- HR / admin send + schedule ----

    @PostMapping("/enrollments/{id}/reminder")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public NotificationDto sendReminder(@PathVariable UUID id,
                                        @Valid @RequestBody SendReminderRequest req,
                                        @AuthenticationPrincipal Jwt jwt) {
        Notification n = service.sendManualReminder(
                id,
                req.channel() != null ? req.channel() : NotificationChannel.IN_APP,
                req.subject(),
                req.body(),
                jwt != null ? jwt.getClaimAsString("email") : null);
        return NotificationDto.from(n);
    }

    public record SendReminderRequest(
            @NotNull NotificationChannel channel,
            @NotBlank String subject,
            @NotBlank String body
    ) {}

    public record UnreadResponse(long unread) {}

    private static UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new IllegalStateException("Missing authenticated user");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
