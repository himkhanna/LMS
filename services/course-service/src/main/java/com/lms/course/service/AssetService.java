package com.lms.course.service;

import com.lms.course.domain.Lesson;
import com.lms.course.domain.LessonAsset;
import com.lms.course.repository.LessonAssetRepository;
import com.lms.course.repository.LessonRepository;
import com.lms.course.storage.ObjectStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AssetService {

    private static final Duration DEFAULT_URL_TTL = Duration.ofMinutes(15);

    private final LessonAssetRepository assets;
    private final LessonRepository lessons;
    private final ObjectStorage storage;

    public AssetService(LessonAssetRepository assets, LessonRepository lessons, ObjectStorage storage) {
        this.assets = assets;
        this.lessons = lessons;
        this.storage = storage;
    }

    public LessonAsset upload(UUID lessonId, MultipartFile file) throws IOException {
        Lesson lesson = lessons.findById(lessonId)
                .orElseThrow(() -> new CourseNotFoundException("Lesson", lessonId));

        String key = "lessons/%s/%s-%s".formatted(lessonId, UUID.randomUUID(), sanitize(file.getOriginalFilename()));
        var stored = storage.put(key, file.getInputStream(), file.getSize(), file.getContentType());

        LessonAsset asset = new LessonAsset();
        asset.setLesson(lesson);
        asset.setStorageKey(stored.key());
        asset.setContentType(stored.contentType());
        asset.setSizeBytes(stored.size());
        asset.setOriginalName(file.getOriginalFilename());
        return assets.save(asset);
    }

    @Transactional(readOnly = true)
    public List<LessonAsset> listForLesson(UUID lessonId) {
        return assets.findByLessonId(lessonId);
    }

    public String urlFor(LessonAsset asset) {
        return storage.signedReadUrl(asset.getStorageKey(), DEFAULT_URL_TTL);
    }

    public void delete(UUID assetId) {
        LessonAsset a = assets.findById(assetId)
                .orElseThrow(() -> new CourseNotFoundException("Asset", assetId));
        storage.delete(a.getStorageKey());
        assets.delete(a);
    }

    private static String sanitize(String name) {
        if (name == null || name.isBlank()) return "file";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
