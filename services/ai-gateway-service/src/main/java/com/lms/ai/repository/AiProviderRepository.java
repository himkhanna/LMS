package com.lms.ai.repository;

import com.lms.ai.domain.AiProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AiProviderRepository extends JpaRepository<AiProvider, UUID> {
    List<AiProvider> findByEnabledTrueOrderByPriorityDescNameAsc();
    Optional<AiProvider> findByName(String name);
    Optional<AiProvider> findByIsDefaultTrue();
}
