package com.lms.course.web;

import com.lms.course.service.AssetService;
import com.lms.course.web.dto.AssetDto;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class AssetController {

    private final AssetService assets;

    public AssetController(AssetService assets) {
        this.assets = assets;
    }

    @PostMapping(value = "/lessons/{lessonId}/assets", consumes = "multipart/form-data")
    public ResponseEntity<AssetDto> upload(@PathVariable UUID lessonId,
                                           @RequestParam("file") MultipartFile file) throws IOException {
        var saved = assets.upload(lessonId, file);
        var dto = AssetDto.from(saved, assets.urlFor(saved));
        return ResponseEntity.created(URI.create("/api/v1/assets/" + saved.getId())).body(dto);
    }

    @GetMapping("/lessons/{lessonId}/assets")
    public List<AssetDto> list(@PathVariable UUID lessonId) {
        return assets.listForLesson(lessonId).stream()
                .map(a -> AssetDto.from(a, assets.urlFor(a)))
                .toList();
    }

    @DeleteMapping("/assets/{assetId}")
    public ResponseEntity<Void> delete(@PathVariable UUID assetId) {
        assets.delete(assetId);
        return ResponseEntity.noContent().build();
    }
}
