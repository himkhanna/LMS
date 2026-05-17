package com.lms.course.certificate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CertificateRepository extends JpaRepository<Certificate, UUID> {
    Optional<Certificate> findByEnrollmentId(UUID enrollmentId);
    List<Certificate> findByUserIdOrderByIssuedAtDesc(UUID userId);
    Optional<Certificate> findBySerial(String serial);
}
