package com.lms.reporting.repository;

import com.lms.reporting.domain.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
