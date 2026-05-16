package com.lms.workflow.repository;

import com.lms.workflow.domain.ApprovalTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ApprovalTaskRepository extends JpaRepository<ApprovalTask, UUID> {
    Page<ApprovalTask> findByStatusOrderByCreatedAtDesc(ApprovalTask.Status status, Pageable pageable);
}
