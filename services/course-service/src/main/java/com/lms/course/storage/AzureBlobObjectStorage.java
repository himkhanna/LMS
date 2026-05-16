package com.lms.course.storage;

import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;

import java.io.InputStream;
import java.time.Duration;
import java.time.OffsetDateTime;

public class AzureBlobObjectStorage implements ObjectStorage {

    private final BlobContainerClient container;

    public AzureBlobObjectStorage(BlobContainerClient container) {
        this.container = container;
        if (!container.exists()) {
            container.create();
        }
    }

    @Override
    public StoredObject put(String key, InputStream content, long size, String contentType) {
        var blob = container.getBlobClient(key);
        blob.upload(content, size, true);
        if (contentType != null) {
            blob.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType));
        }
        return new StoredObject(key, size, contentType);
    }

    @Override
    public String signedReadUrl(String key, Duration ttl) {
        var blob = container.getBlobClient(key);
        var permission = new BlobSasPermission().setReadPermission(true);
        var sasValues = new BlobServiceSasSignatureValues(OffsetDateTime.now().plus(ttl), permission);
        String sas = blob.generateSas(sasValues);
        return blob.getBlobUrl() + "?" + sas;
    }

    @Override
    public void delete(String key) {
        container.getBlobClient(key).deleteIfExists();
    }
}
