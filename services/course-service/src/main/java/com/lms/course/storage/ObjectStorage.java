package com.lms.course.storage;

import java.io.InputStream;
import java.time.Duration;

public interface ObjectStorage {

    StoredObject put(String key, InputStream content, long size, String contentType);

    String signedReadUrl(String key, Duration ttl);

    void delete(String key);

    record StoredObject(String key, long size, String contentType) {}
}
