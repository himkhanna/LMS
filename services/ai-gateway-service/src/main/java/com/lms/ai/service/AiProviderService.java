package com.lms.ai.service;

import com.lms.ai.domain.AiProvider;
import com.lms.ai.domain.ProviderType;
import com.lms.ai.provider.AiProviderClient;
import com.lms.ai.provider.CompletionRequest;
import com.lms.ai.provider.Message;
import com.lms.ai.provider.ProviderException;
import com.lms.ai.provider.ProviderRegistry;
import com.lms.ai.repository.AiProviderRepository;
import com.lms.ai.web.dto.CreateProviderRequest;
import com.lms.ai.web.dto.TestProviderResult;
import com.lms.ai.web.dto.UpdateProviderRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AiProviderService {

    private final AiProviderRepository providers;
    private final ProviderRegistry registry;

    public AiProviderService(AiProviderRepository providers, ProviderRegistry registry) {
        this.providers = providers;
        this.registry = registry;
    }

    @Transactional(readOnly = true)
    public List<AiProvider> list() {
        return providers.findAll();
    }

    @Transactional(readOnly = true)
    public AiProvider get(UUID id) {
        return providers.findById(id)
                .orElseThrow(() -> new NotFoundException("Provider not found: " + id));
    }

    public AiProvider create(CreateProviderRequest req) {
        AiProvider p = new AiProvider();
        p.setProviderType(req.providerType());
        p.setName(req.name());
        p.setApiKey(req.apiKey());
        p.setBaseUrl(req.baseUrl());
        p.setDefaultModel(req.defaultModel());
        p.setEnabled(req.enabled() == null || req.enabled());
        p.setPriority(req.priority() == null ? 0 : req.priority());
        p.setConfig(req.config());
        if (Boolean.TRUE.equals(req.isDefault())) {
            clearDefault();
            p.setDefault(true);
        }
        return providers.save(p);
    }

    public AiProvider update(UUID id, UpdateProviderRequest req) {
        AiProvider p = get(id);
        if (req.name() != null) p.setName(req.name());
        if (req.apiKey() != null) p.setApiKey(req.apiKey());
        if (req.baseUrl() != null) p.setBaseUrl(req.baseUrl());
        if (req.defaultModel() != null) p.setDefaultModel(req.defaultModel());
        if (req.enabled() != null) p.setEnabled(req.enabled());
        if (req.priority() != null) p.setPriority(req.priority());
        if (req.config() != null) p.setConfig(req.config());
        if (req.isDefault() != null) {
            if (req.isDefault()) {
                clearDefault();
                p.setDefault(true);
            } else {
                p.setDefault(false);
            }
        }
        return p;
    }

    public void delete(UUID id) {
        if (!providers.existsById(id)) throw new NotFoundException("Provider not found: " + id);
        providers.deleteById(id);
    }

    public TestProviderResult test(UUID id) {
        AiProvider p = get(id);
        AiProviderClient client = registry.clientFor(p.getProviderType());
        long start = System.currentTimeMillis();
        try {
            var resp = client.complete(p, new CompletionRequest(
                    p.getDefaultModel(),
                    List.of(Message.user("ping")),
                    0.0,
                    8
            ));
            long latency = System.currentTimeMillis() - start;
            return new TestProviderResult(true, resp.content(), null, latency);
        } catch (ProviderException e) {
            long latency = System.currentTimeMillis() - start;
            return new TestProviderResult(false, null, e.getMessage(), latency);
        }
    }

    private void clearDefault() {
        providers.findByIsDefaultTrue().ifPresent(p -> p.setDefault(false));
        providers.flush();
    }

    public static final class NotFoundException extends RuntimeException {
        public NotFoundException(String message) { super(message); }
    }
}
