package com.lms.course.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/v1/assets/files")
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalAssetController {

    private final Path root;

    public LocalAssetController(@Value("${app.storage.local.root}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    @GetMapping("/{*key}")
    public ResponseEntity<Resource> serve(@PathVariable String key) throws IOException {
        String stripped = key.startsWith("/") ? key.substring(1) : key;
        Path file = root.resolve(stripped).normalize();
        if (!file.startsWith(root) || !Files.exists(file)) {
            return ResponseEntity.notFound().build();
        }
        String contentType = Files.probeContentType(file);
        return ResponseEntity.ok()
                .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                .body(new FileSystemResource(file));
    }
}
