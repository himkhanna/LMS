package com.lms.workflow.web;

import com.lms.workflow.domain.ApprovalTask;
import com.lms.workflow.repository.ApprovalTaskRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/approvals")
@Transactional
public class ApprovalController {

    private final ApprovalTaskRepository tasks;

    public ApprovalController(ApprovalTaskRepository tasks) { this.tasks = tasks; }

    @PostMapping
    public ResponseEntity<ApprovalTask> request(@Valid @RequestBody RequestApproval req,
                                                 @AuthenticationPrincipal Jwt jwt) {
        ApprovalTask t = new ApprovalTask();
        t.setEntityType(req.entityType());
        t.setEntityId(req.entityId());
        t.setAction(req.action());
        t.setRequesterId(jwt.getSubject());
        return ResponseEntity.status(201).body(tasks.save(t));
    }

    @GetMapping
    public Page<ApprovalTask> list(@RequestParam(defaultValue = "PENDING") ApprovalTask.Status status,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "50") int size) {
        return tasks.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, Math.min(size, 200)));
    }

    @PostMapping("/{id}/approve")
    public ApprovalTask approve(@PathVariable UUID id, @RequestBody(required = false) Decision req,
                                 @AuthenticationPrincipal Jwt jwt) {
        return decide(id, ApprovalTask.Status.APPROVED, req, jwt);
    }

    @PostMapping("/{id}/reject")
    public ApprovalTask reject(@PathVariable UUID id, @RequestBody(required = false) Decision req,
                                @AuthenticationPrincipal Jwt jwt) {
        return decide(id, ApprovalTask.Status.REJECTED, req, jwt);
    }

    private ApprovalTask decide(UUID id, ApprovalTask.Status status, Decision req, Jwt jwt) {
        ApprovalTask t = tasks.findById(id).orElseThrow();
        if (t.getStatus() != ApprovalTask.Status.PENDING) {
            throw new IllegalStateException("Already decided: " + t.getStatus());
        }
        t.setStatus(status);
        t.setApproverId(jwt.getSubject());
        if (req != null) t.setComment(req.comment());
        t.setDecidedAt(OffsetDateTime.now());
        return t;
    }

    public record RequestApproval(@NotBlank String entityType, @NotNull UUID entityId, @NotBlank String action) {}
    public record Decision(String comment) {}
}
