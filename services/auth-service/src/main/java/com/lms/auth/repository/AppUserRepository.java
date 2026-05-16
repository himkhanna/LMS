package com.lms.auth.repository;

import com.lms.auth.domain.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    Optional<AppUser> findByMicrosoftOid(String microsoftOid);
    long countByRole(AppUser.Role role);

    @Query("""
            SELECT u FROM AppUser u
            WHERE (:role IS NULL OR u.role = :role)
              AND (:status IS NULL OR u.status = :status)
              AND (:q IS NULL OR lower(u.email) LIKE :q OR lower(coalesce(u.displayName,'')) LIKE :q)
            ORDER BY u.createdAt DESC
            """)
    Page<AppUser> adminSearch(@Param("role") AppUser.Role role,
                              @Param("status") AppUser.Status status,
                              @Param("q") String q,
                              Pageable pageable);
}
