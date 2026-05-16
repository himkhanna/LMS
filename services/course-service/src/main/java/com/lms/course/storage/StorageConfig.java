package com.lms.course.storage;

import com.azure.storage.blob.BlobServiceClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;

@Configuration
public class StorageConfig {

    @Bean
    @ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
    public ObjectStorage localObjectStorage(@Value("${app.storage.local.root}") String root) {
        return new LocalObjectStorage(Path.of(root));
    }

    @Bean
    @ConditionalOnProperty(name = "app.storage.provider", havingValue = "azure")
    public ObjectStorage azureObjectStorage(
            @Value("${app.storage.azure.connection-string}") String connectionString,
            @Value("${app.storage.azure.container}") String containerName) {
        var serviceClient = new BlobServiceClientBuilder()
                .connectionString(connectionString)
                .buildClient();
        return new AzureBlobObjectStorage(serviceClient.getBlobContainerClient(containerName));
    }
}
