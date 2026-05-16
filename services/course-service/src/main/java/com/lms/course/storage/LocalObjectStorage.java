package com.lms.course.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

public class LocalObjectStorage implements ObjectStorage {

    private static final Logger log = LoggerFactory.getLogger(LocalObjectStorage.class);

    private final Path root;

    public LocalObjectStorage(Path root) {
        this.root = root;
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create storage root " + root, e);
        }
    }

    @Override
    public StoredObject put(String key, InputStream content, long size, String contentType) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Invalid key: " + key);
        }
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
            long actual = Files.size(target);
            return new StoredObject(key, actual, contentType);
        } catch (IOException e) {
            throw new StorageException("Failed to write " + key, e);
        }
    }

    @Override
    public String signedReadUrl(String key, Duration ttl) {
        return "/api/v1/assets/files/" + key;
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(root.resolve(key));
        } catch (IOException e) {
            log.warn("Failed to delete {}", key, e);
        }
    }
}
