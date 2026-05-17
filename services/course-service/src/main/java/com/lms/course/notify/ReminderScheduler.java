package com.lms.course.notify;

import com.lms.course.enrollment.Enrollment;
import com.lms.course.enrollment.EnrollmentRepository;
import com.lms.course.enrollment.EnrollmentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Cron-driven notification workflow. Every day at 09:00:
 *
 *  - DUE_SOON  : for every enrollment due in 7 / 3 / 1 day(s), send the
 *                learner one in-app + one email reminder, once per bucket.
 *  - OVERDUE   : for every active enrollment past its due date, send the
 *                learner a daily in-app + email nudge.
 *  - ESCALATION: if an enrollment is > 7 days overdue AND we have a
 *                manager_email on file, send the manager an escalation
 *                notice (once per enrollment).
 *
 * Run manually via {@link AdminNotifyController#runReminders()}.
 */
@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private static final int[] DUE_SOON_DAYS = {7, 3, 1};
    private static final int ESCALATION_DAYS = 7;

    @PersistenceContext
    private EntityManager em;

    private final NotificationService notifier;
    private final EnrollmentRepository enrollments;

    public ReminderScheduler(NotificationService notifier, EnrollmentRepository enrollments) {
        this.notifier = notifier;
        this.enrollments = enrollments;
    }

    @Scheduled(cron = "${app.notify.reminder-cron:0 0 9 * * *}")
    @Transactional
    public void runReminders() {
        log.info("running reminder scheduler");
        OffsetDateTime now = OffsetDateTime.now();
        String today = now.format(DateTimeFormatter.ISO_LOCAL_DATE);

        List<Enrollment> active = em.createQuery("""
                        SELECT e FROM Enrollment e
                        WHERE e.status IN (com.lms.course.enrollment.EnrollmentStatus.ASSIGNED,
                                           com.lms.course.enrollment.EnrollmentStatus.IN_PROGRESS)
                          AND e.dueAt IS NOT NULL
                        """, Enrollment.class)
                .getResultList();

        int duePicks = 0, overdueNudges = 0, escalations = 0;
        for (Enrollment e : active) {
            long minutesUntilDue = Duration.between(now, e.getDueAt()).toMinutes();
            long daysUntilDue = minutesUntilDue / (60 * 24);

            // DUE_SOON buckets: fire when daysUntilDue ~ 7/3/1
            if (minutesUntilDue > 0) {
                for (int d : DUE_SOON_DAYS) {
                    if (daysUntilDue == d) {
                        var created = notifier.createIfFirstInBucket(
                                e,
                                NotificationType.DUE_SOON,
                                "DUE_" + d + "D",
                                NotificationChannel.IN_APP,
                                "Reminder: " + e.getCourse().getTitle() + " is due in " + d + " day" + (d == 1 ? "" : "s"),
                                buildDueSoonBody(e, d));
                        if (created != null) duePicks++;
                        // also push an email copy
                        notifier.createIfFirstInBucket(
                                e,
                                NotificationType.DUE_SOON,
                                "DUE_" + d + "D_EMAIL",
                                NotificationChannel.EMAIL,
                                "Your training is due in " + d + " day" + (d == 1 ? "" : "s"),
                                buildDueSoonBody(e, d));
                    }
                }
            } else {
                // Past due
                long daysOverdue = -daysUntilDue;
                var created = notifier.createIfFirstInBucket(
                        e,
                        NotificationType.OVERDUE,
                        "OVERDUE_" + today,
                        NotificationChannel.IN_APP,
                        "Overdue: " + e.getCourse().getTitle(),
                        buildOverdueBody(e, daysOverdue));
                if (created != null) overdueNudges++;
                notifier.createIfFirstInBucket(
                        e,
                        NotificationType.OVERDUE,
                        "OVERDUE_" + today + "_EMAIL",
                        NotificationChannel.EMAIL,
                        "Action needed: " + e.getCourse().getTitle() + " is overdue",
                        buildOverdueBody(e, daysOverdue));

                // ESCALATION to manager — once per enrollment when threshold crossed
                if (daysOverdue >= ESCALATION_DAYS
                        && e.getManagerEmail() != null
                        && !e.getManagerEmail().isBlank()) {
                    var esc = notifier.createIfFirstInBucket(
                            e,
                            NotificationType.ESCALATION,
                            "ESCALATION_FIRST",
                            NotificationChannel.EMAIL,
                            "Direct report overdue: " + e.getCourse().getTitle(),
                            buildEscalationBody(e, daysOverdue));
                    if (esc != null) {
                        // Override recipient to the manager
                        esc.setRecipientEmail(e.getManagerEmail());
                        // Manager may not be a registered user; keep recipientUserId
                        // as the learner's (we still need a value), but the email
                        // routing targets the manager.
                        escalations++;
                    }
                }
            }

            if (e.getStatus() == EnrollmentStatus.COMPLETED) {
                // Send a one-shot congratulations notification
                notifier.createIfFirstInBucket(
                        e,
                        NotificationType.COMPLETED,
                        "COMPLETED",
                        NotificationChannel.IN_APP,
                        "Completed: " + e.getCourse().getTitle(),
                        "Great work — you finished " + e.getCourse().getTitle() + ".");
            }
        }
        log.info("reminder run done: due-soon={} overdue={} escalations={}",
                duePicks, overdueNudges, escalations);
    }

    private static String buildDueSoonBody(Enrollment e, int days) {
        return ("Hi " + safeName(e) + ",\n\n"
                + "This is a reminder that your course \"" + e.getCourse().getTitle()
                + "\" is due in " + days + " day" + (days == 1 ? "" : "s") + " on "
                + isoDate(e.getDueAt()) + ".\n"
                + "Open \"My Learning\" to continue where you left off.\n");
    }

    private static String buildOverdueBody(Enrollment e, long daysOverdue) {
        return ("Hi " + safeName(e) + ",\n\n"
                + "Your course \"" + e.getCourse().getTitle() + "\" is "
                + daysOverdue + " day" + (daysOverdue == 1 ? "" : "s") + " overdue"
                + (e.isMandatory() ? " (mandatory training)" : "") + ".\n"
                + "Please complete it as soon as possible.\n");
    }

    private static String buildEscalationBody(Enrollment e, long daysOverdue) {
        return ("Hello,\n\n"
                + safeName(e) + " has not completed the assigned course \""
                + e.getCourse().getTitle() + "\" which is now "
                + daysOverdue + " day" + (daysOverdue == 1 ? "" : "s") + " overdue"
                + (e.isMandatory() ? " (mandatory training)" : "") + ".\n"
                + "Please follow up with them.\n");
    }

    private static String safeName(Enrollment e) {
        return e.getUserName() != null && !e.getUserName().isBlank()
                ? e.getUserName()
                : e.getUserEmail();
    }

    private static String isoDate(OffsetDateTime t) {
        return t == null ? "—" : t.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }
}
