package com.lms.course.notify;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin/HR controls for the notification subsystem — currently just a
 * manual trigger for the daily reminder workflow (useful for testing
 * and for catching up after downtime).
 */
@RestController
@RequestMapping("/api/v1/admin/notifications")
@PreAuthorize("hasAnyRole('ADMIN','HR')")
public class AdminNotifyController {

    private final ReminderScheduler scheduler;

    public AdminNotifyController(ReminderScheduler scheduler) {
        this.scheduler = scheduler;
    }

    @PostMapping("/run-reminders")
    public ResponseEntity<Void> runReminders() {
        scheduler.runReminders();
        return ResponseEntity.noContent().build();
    }
}
