package com.lms.ai.repository;

import com.lms.ai.domain.AiUsageLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {
    Page<AiUsageLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
