package com.lms.analytics.repository;

import com.lms.analytics.domain.LearningEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface LearningEventRepository extends JpaRepository<LearningEvent, UUID> {

    @Query(value = """
            SELECT event_type AS eventType, COUNT(*) AS total
            FROM learning_event
            WHERE occurred_at >= :since
            GROUP BY event_type
            ORDER BY total DESC
            """, nativeQuery = true)
    List<EventCount> countByType(@Param("since") OffsetDateTime since);

    @Query(value = """
            SELECT COUNT(DISTINCT user_id)
            FROM learning_event
            WHERE occurred_at >= :since
            """, nativeQuery = true)
    long activeUsersSince(@Param("since") OffsetDateTime since);

    interface EventCount {
        String getEventType();
        long getTotal();
    }
}
