package com.lms.ai.web;

import com.lms.ai.service.AiProviderService;
import com.lms.ai.web.dto.CreateProviderRequest;
import com.lms.ai.web.dto.ProviderDto;
import com.lms.ai.web.dto.TestProviderResult;
import com.lms.ai.web.dto.UpdateProviderRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/providers")
public class AdminProviderController {

    private final AiProviderService service;

    public AdminProviderController(AiProviderService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProviderDto> list() {
        return service.list().stream().map(ProviderDto::from).toList();
    }

    @GetMapping("/{id}")
    public ProviderDto get(@PathVariable UUID id) {
        return ProviderDto.from(service.get(id));
    }

    @PostMapping
    public ResponseEntity<ProviderDto> create(@Valid @RequestBody CreateProviderRequest req) {
        var p = service.create(req);
        return ResponseEntity.created(URI.create("/api/v1/admin/providers/" + p.getId()))
                .body(ProviderDto.from(p));
    }

    @PatchMapping("/{id}")
    public ProviderDto update(@PathVariable UUID id, @RequestBody UpdateProviderRequest req) {
        return ProviderDto.from(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/test")
    public TestProviderResult test(@PathVariable UUID id) {
        return service.test(id);
    }
}
