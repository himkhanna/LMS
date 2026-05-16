package com.lms.notification.web;

import com.lms.notification.domain.Notification;
import com.lms.notification.repository.NotificationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class NotificationController {

    private static final Logger log = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationRepository notifications;

    public NotificationController(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @GetMapping("/me/notifications")
    public Page<Notification> mine(@AuthenticationPrincipal Jwt jwt,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "50") int size) {
        return notifications.findByUserIdOrderByCreatedAtDesc(jwt.getSubject(),
                PageRequest.of(page, Math.min(size, 200)));
    }

    @GetMapping("/me/notifications/unread-count")
    public Map<String, Long> unread(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("unread", notifications.countByUserIdAndReadAtIsNull(jwt.getSubject()));
    }

    @PostMapping("/me/notifications/{id}/read")
    public Notification markRead(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        Notification n = notifications.findById(id).orElseThrow();
        if (!n.getUserId().equals(jwt.getSubject())) throw new SecurityException("not owner");
        n.setReadAt(OffsetDateTime.now());
        return n;
    }

    @PostMapping("/admin/notifications")
    public ResponseEntity<Notification> send(@Valid @RequestBody SendRequest req) {
        Notification n = new Notification();
        n.setUserId(req.userId());
        n.setType(req.type());
        n.setTitle(req.title());
        n.setBody(req.body());
        n.setPayload(req.payload());
        Notification saved = notifications.save(n);
        log.info("notification sent userId={} type={}", saved.getUserId(), saved.getType());
        // TODO: dispatch to email / push channels
        return ResponseEntity.status(201).body(saved);
    }

    public record SendRequest(@NotBlank String userId, @NotBlank String type,
                              @NotBlank String title, String body,
                              Map<String, Object> payload) {}
}
