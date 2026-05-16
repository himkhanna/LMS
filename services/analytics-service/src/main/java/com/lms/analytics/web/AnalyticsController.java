package com.lms.analytics.web;

import com.lms.analytics.domain.LearningEvent;
import com.lms.analytics.repository.LearningEventRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class AnalyticsController {

    private final LearningEventRepository events;

    public AnalyticsController(LearningEventRepository events) { this.events = events; }

    @PostMapping("/events")
    public ResponseEntity<LearningEvent> track(@Valid @RequestBody TrackRequest req,
                                                @AuthenticationPrincipal Jwt jwt) {
        LearningEvent e = new LearningEvent();
        e.setUserId(req.userId() != null ? req.userId() : jwt.getSubject());
        e.setEventType(req.eventType());
        e.setCourseId(req.courseId());
        e.setLessonId(req.lessonId());
        e.setPayload(req.payload());
        return ResponseEntity.status(201).body(events.save(e));
    }

    @GetMapping("/metrics/event-counts")
    public List<LearningEventRepository.EventCount> counts(
            @RequestParam(defaultValue = "30") int days) {
        return events.countByType(OffsetDateTime.now().minusDays(days));
    }

    @GetMapping("/metrics/active-users")
    public Map<String, Long> activeUsers(@RequestParam(defaultValue = "30") int days) {
        return Map.of("activeUsers", events.activeUsersSince(OffsetDateTime.now().minusDays(days)));
    }

    public record TrackRequest(@NotBlank String eventType, String userId,
                               UUID courseId, UUID lessonId,
                               Map<String, Object> payload) {}
}
