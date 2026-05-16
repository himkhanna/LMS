package com.lms.aiorch.web;

import com.lms.aiorch.domain.PipelineRun;
import com.lms.aiorch.repository.PipelineRunRepository;
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
@RequestMapping("/api/v1/pipelines")
@Transactional
public class PipelineController {

    private final PipelineRunRepository runs;

    public PipelineController(PipelineRunRepository runs) { this.runs = runs; }

    @PostMapping("/{pipeline}/runs")
    public ResponseEntity<PipelineRun> startRun(@PathVariable String pipeline,
                                                @RequestBody(required = false) Map<String, Object> input,
                                                @AuthenticationPrincipal Jwt jwt) {
        PipelineRun r = new PipelineRun();
        r.setPipeline(pipeline);
        r.setStatus(PipelineRun.Status.PENDING);
        r.setInput(input);
        if (jwt != null) r.setUserId(jwt.getSubject());
        runs.save(r);
        // TODO: enqueue async worker that calls ai-gateway, fills output and status.
        return ResponseEntity.status(202).body(r);
    }

    @GetMapping("/runs/{id}")
    public PipelineRun get(@PathVariable UUID id) {
        return runs.findById(id).orElseThrow();
    }

    @GetMapping("/{pipeline}/runs")
    public Page<PipelineRun> list(@PathVariable String pipeline,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "50") int size) {
        return runs.findByPipelineOrderByCreatedAtDesc(pipeline, PageRequest.of(page, Math.min(size, 200)));
    }
}
