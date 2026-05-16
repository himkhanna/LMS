package com.lms.aiorch.repository;

import com.lms.aiorch.domain.PipelineRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PipelineRunRepository extends JpaRepository<PipelineRun, UUID> {
    Page<PipelineRun> findByPipelineOrderByCreatedAtDesc(String pipeline, Pageable pageable);
}
