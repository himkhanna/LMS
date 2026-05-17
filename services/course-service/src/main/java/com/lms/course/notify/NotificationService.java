package com.lms.course.notify;

import com.lms.course.enrollment.Enrollment;
import com.lms.course.enrollment.EnrollmentRepository;
import com.lms.course.service.CourseNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notifications;
    private final NotificationDispatchLogRepository dispatchLog;
    private final EnrollmentRepository enrollments;
    private final EmailSender email;

    public NotificationService(NotificationRepository notifications,
                               NotificationDispatchLogRepository dispatchLog,
                               EnrollmentRepository enrollments,
                               EmailSender email) {
        this.notifications = notifications;
        this.dispatchLog = dispatchLog;
        this.enrollments = enrollments;
        this.email = email;
    }

    /** Create + dispatch in one shot. Suitable for ad-hoc HR reminders. */
    public Notification createAndDispatch(Notification n) {
        Notification saved = notifications.save(n);
        dispatch(saved);
        return saved;
    }

    public Notification dispatch(Notification n) {
        try {
            if (n.getChannel() == NotificationChannel.EMAIL) {
                email.send(n.getRecipientEmail(), n.getSubject(), n.getBody());
            }
            n.setStatus(NotificationStatus.SENT);
            n.setSentAt(OffsetDateTime.now());
        } catch (Exception e) {
            log.warn("notification dispatch failed: {}", e.getMessage());
            n.setStatus(NotificationStatus.FAILED);
            n.setError(e.getMessage());
        }
        return n;
    }

    @Transactional(readOnly = true)
    public Page<Notification> listForUser(UUID userId, Pageable pageable) {
        return notifications.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        // SENT but not yet READ. PENDING shouldn't happen for in-app since
        // createAndDispatch flips it immediately on success.
        return notifications.countByRecipientUserIdAndStatus(userId, NotificationStatus.SENT);
    }

    public void markRead(UUID id, UUID userId) {
        Notification n = notifications.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Notification", id));
        if (!n.getRecipientUserId().equals(userId)) {
            throw new IllegalArgumentException("Cannot mark another user's notification");
        }
        n.setStatus(NotificationStatus.READ);
        n.setReadAt(OffsetDateTime.now());
    }

    public void markAllRead(UUID userId) {
        Pageable all = org.springframework.data.domain.PageRequest.of(0, 500);
        for (Notification n : notifications.findByRecipientUserIdOrderByCreatedAtDesc(userId, all)) {
            if (n.getStatus() != NotificationStatus.READ) {
                n.setStatus(NotificationStatus.READ);
                n.setReadAt(OffsetDateTime.now());
            }
        }
    }

    /**
     * Create a notification with idempotency: if this enrollment already had
     * a notification of {@code type} in {@code bucket}, skip it.
     * Returns the new notification or null when deduped.
     */
    public Notification createIfFirstInBucket(Enrollment e,
                                              NotificationType type,
                                              String bucket,
                                              NotificationChannel channel,
                                              String subject,
                                              String body) {
        if (dispatchLog.existsByEnrollmentIdAndTypeAndBucket(e.getId(), type, bucket)) {
            return null;
        }
        Notification n = new Notification();
        n.setRecipientUserId(e.getUserId());
        n.setRecipientEmail(e.getUserEmail());
        n.setChannel(channel);
        n.setType(type);
        n.setSubject(subject);
        n.setBody(body);
        n.setEnrollmentId(e.getId());
        n.setCourseId(e.getCourse().getId());
        Notification saved = createAndDispatch(n);

        NotificationDispatchLog logEntry = new NotificationDispatchLog();
        logEntry.setEnrollmentId(e.getId());
        logEntry.setType(type);
        logEntry.setBucket(bucket);
        dispatchLog.save(logEntry);

        return saved;
    }

    /** Build a manual reminder for a single enrollment. */
    public Notification sendManualReminder(UUID enrollmentId,
                                           NotificationChannel channel,
                                           String subject,
                                           String body,
                                           String createdByEmail) {
        Enrollment e = enrollments.findById(enrollmentId)
                .orElseThrow(() -> new CourseNotFoundException("Enrollment", enrollmentId));
        Notification n = new Notification();
        n.setRecipientUserId(e.getUserId());
        n.setRecipientEmail(e.getUserEmail());
        n.setChannel(channel);
        n.setType(NotificationType.MANUAL);
        n.setSubject(subject);
        n.setBody(body);
        n.setEnrollmentId(e.getId());
        n.setCourseId(e.getCourse().getId());
        n.setCreatedByEmail(createdByEmail);
        return createAndDispatch(n);
    }

}
