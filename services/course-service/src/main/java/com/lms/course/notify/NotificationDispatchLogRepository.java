package com.lms.course.notify;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationDispatchLogRepository extends JpaRepository<NotificationDispatchLog, UUID> {
    boolean existsByEnrollmentIdAndTypeAndBucket(UUID enrollmentId, NotificationType type, String bucket);
}
