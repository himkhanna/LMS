package com.lms.search.web;

import com.lms.search.domain.SearchDoc;
import com.lms.search.repository.SearchDocRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/search")
@Transactional
public class SearchController {

    private final SearchDocRepository docs;

    public SearchController(SearchDocRepository docs) { this.docs = docs; }

    @GetMapping
    public Page<SearchDoc> search(@RequestParam("q") String q,
                                   @RequestParam(required = false) String entityType,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        if (q == null || q.isBlank()) return Page.empty(PageRequest.of(page, size));
        return docs.search(q.trim(), entityType, PageRequest.of(page, Math.min(size, 100)));
    }

    @PostMapping("/index")
    public ResponseEntity<SearchDoc> upsert(@Valid @RequestBody IndexRequest req) {
        SearchDoc d = docs.findByEntityTypeAndEntityId(req.entityType(), req.entityId())
                .orElseGet(SearchDoc::new);
        d.setEntityType(req.entityType());
        d.setEntityId(req.entityId());
        d.setTitle(req.title());
        d.setBody(req.body());
        d.setTags(req.tags());
        return ResponseEntity.ok(docs.save(d));
    }

    @DeleteMapping("/{entityType}/{entityId}")
    public ResponseEntity<Void> remove(@PathVariable String entityType, @PathVariable UUID entityId) {
        docs.findByEntityTypeAndEntityId(entityType, entityId).ifPresent(docs::delete);
        return ResponseEntity.noContent().build();
    }

    public record IndexRequest(@NotBlank String entityType, @NotNull UUID entityId,
                               @NotBlank String title, String body, String[] tags) {}
}
