package com.lms.reporting.web;

import com.lms.reporting.domain.Report;
import com.lms.reporting.repository.ReportRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@Transactional
public class ReportController {

    private final ReportRepository reports;

    public ReportController(ReportRepository reports) { this.reports = reports; }

    @PostMapping
    public ResponseEntity<Report> request(@Valid @RequestBody RequestReport req,
                                           @AuthenticationPrincipal Jwt jwt) {
        Report r = new Report();
        r.setType(req.type());
        r.setParams(req.params());
        r.setRequestedBy(jwt.getSubject());
        // TODO: enqueue async worker that builds CSV and uploads to object storage.
        return ResponseEntity.status(202).body(reports.save(r));
    }

    @GetMapping
    public Page<Report> list(@RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "50") int size) {
        return reports.findAllByOrderByCreatedAtDesc(PageRequest.of(page, Math.min(size, 200)));
    }

    @GetMapping("/{id}")
    public Report get(@PathVariable UUID id) { return reports.findById(id).orElseThrow(); }

    public record RequestReport(@NotBlank String type, Map<String, Object> params) {}
}
