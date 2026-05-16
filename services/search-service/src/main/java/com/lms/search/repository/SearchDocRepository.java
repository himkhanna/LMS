package com.lms.search.repository;

import com.lms.search.domain.SearchDoc;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface SearchDocRepository extends JpaRepository<SearchDoc, UUID> {
    Optional<SearchDoc> findByEntityTypeAndEntityId(String entityType, UUID entityId);

    @Query(value = """
            SELECT s.* FROM search_doc s
            WHERE s.search_vector @@ plainto_tsquery('english', :q)
              AND (:entityType IS NULL OR s.entity_type = :entityType)
            ORDER BY ts_rank(s.search_vector, plainto_tsquery('english', :q)) DESC
            """,
            countQuery = """
            SELECT count(*) FROM search_doc s
            WHERE s.search_vector @@ plainto_tsquery('english', :q)
              AND (:entityType IS NULL OR s.entity_type = :entityType)
            """,
            nativeQuery = true)
    Page<SearchDoc> search(@Param("q") String q, @Param("entityType") String entityType, Pageable pageable);
}
