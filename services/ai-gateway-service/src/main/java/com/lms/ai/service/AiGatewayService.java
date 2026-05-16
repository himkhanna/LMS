package com.lms.ai.service;

import com.lms.ai.domain.AiProvider;
import com.lms.ai.domain.AiUsageLog;
import com.lms.ai.provider.AiProviderClient;
import com.lms.ai.provider.CompletionRequest;
import com.lms.ai.provider.CompletionResponse;
import com.lms.ai.provider.ProviderException;
import com.lms.ai.provider.ProviderRegistry;
import com.lms.ai.repository.AiProviderRepository;
import com.lms.ai.repository.AiUsageLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AiGatewayService {

    private static final Logger log = LoggerFactory.getLogger(AiGatewayService.class);

    private final AiProviderRepository providers;
    private final AiUsageLogRepository usageLogs;
    private final ProviderRegistry registry;

    public AiGatewayService(AiProviderRepository providers,
                            AiUsageLogRepository usageLogs,
                            ProviderRegistry registry) {
        this.providers = providers;
        this.usageLogs = usageLogs;
        this.registry = registry;
    }

    @Transactional(readOnly = true)
    public List<AiProvider> candidates(UUID preferredProviderId) {
        if (preferredProviderId != null) {
            return providers.findById(preferredProviderId)
                    .filter(AiProvider::isEnabled)
                    .map(List::of)
                    .orElseThrow(() -> new ProviderException("Provider not found or disabled: " + preferredProviderId));
        }
        List<AiProvider> enabled = providers.findByEnabledTrueOrderByPriorityDescNameAsc();
        if (enabled.isEmpty()) throw new ProviderException("No enabled AI providers");
        return providers.findByIsDefaultTrue()
                .map(d -> {
                    List<AiProvider> ordered = new java.util.ArrayList<>();
                    ordered.add(d);
                    for (AiProvider p : enabled) if (!p.getId().equals(d.getId())) ordered.add(p);
                    return ordered;
                })
                .orElse(enabled);
    }

    public CompletionResponse complete(CompletionRequest request, UUID preferredProviderId, String useCase, String userId) {
        List<AiProvider> candidates = candidates(preferredProviderId);
        ProviderException lastError = null;

        for (AiProvider provider : candidates) {
            long start = System.currentTimeMillis();
            try {
                AiProviderClient client = registry.clientFor(provider.getProviderType());
                CompletionResponse response = client.complete(provider, request);
                int latency = (int) (System.currentTimeMillis() - start);
                logUsage(provider, response, request, latency, AiUsageLog.Status.SUCCESS, null, useCase, userId);
                return response;
            } catch (ProviderException e) {
                int latency = (int) (System.currentTimeMillis() - start);
                logUsage(provider, null, request, latency, AiUsageLog.Status.ERROR, e.getMessage(), useCase, userId);
                log.warn("Provider {} failed: {}", provider.getName(), e.getMessage());
                lastError = e;
            }
        }
        throw lastError != null ? lastError : new ProviderException("All providers failed");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logUsage(AiProvider provider,
                         CompletionResponse response,
                         CompletionRequest request,
                         int latencyMs,
                         AiUsageLog.Status status,
                         String error,
                         String useCase,
                         String userId) {
        AiUsageLog log = new AiUsageLog();
        log.setProviderId(provider.getId());
        log.setProviderType(provider.getProviderType());
        log.setModel(response != null ? response.model() :
                (request.model() != null ? request.model() : provider.getDefaultModel()));
        log.setUseCase(useCase);
        log.setUserId(userId);
        if (response != null) {
            log.setPromptTokens(response.promptTokens());
            log.setCompletionTokens(response.completionTokens());
            log.setTotalTokens(response.totalTokens());
        }
        log.setLatencyMs(latencyMs);
        log.setStatus(status);
        log.setErrorMessage(error);
        usageLogs.save(log);
    }
}
