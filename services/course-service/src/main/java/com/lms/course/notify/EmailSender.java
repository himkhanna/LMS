package com.lms.course.notify;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * Pluggable email delivery surface.
 *
 * <p>Sends via Spring's {@link JavaMailSender} when both
 * {@code app.notify.email.enabled} is true and {@code spring.mail.username}
 * is set. Otherwise falls back to log-only mode so the platform works
 * end-to-end without SMTP configured — useful in dev and CI.
 *
 * <p>Defaults are tuned for Microsoft 365 / Exchange Online
 * ({@code smtp.office365.com:587}, STARTTLS, SMTP AUTH).
 */
@Component
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    private final boolean enabled;
    private final String from;
    private final String fromName;
    private final String username;
    private final JavaMailSender mailSender;

    public EmailSender(@Value("${app.notify.email.enabled:true}") boolean enabled,
                       @Value("${app.notify.email.from:learning@idcdigital.local}") String from,
                       @Value("${app.notify.email.from-name:IDC Digital Learning}") String fromName,
                       @Value("${spring.mail.username:}") String username,
                       JavaMailSender mailSender) {
        this.enabled = enabled;
        this.from = from;
        this.fromName = fromName;
        this.username = username;
        this.mailSender = mailSender;
    }

    /** Returns true on success. Logs and returns false on hard failure. */
    public boolean send(String to, String subject, String body) {
        if (to == null || to.isBlank()) return false;
        if (!enabled || username == null || username.isBlank()) {
            log.info("[email→{}] (dev/log-only) subject={}", to, subject);
            log.debug("[email body] {}", body);
            return true;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            try {
                helper.setFrom(new InternetAddress(from, fromName, StandardCharsets.UTF_8.name()));
            } catch (UnsupportedEncodingException e) {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);
            mailSender.send(message);
            log.info("email sent to={} subject={}", to, subject);
            return true;
        } catch (MailException | MessagingException e) {
            log.warn("email send failed to={} subject={} err={}", to, subject, e.getMessage());
            // Surface as a thrown exception so NotificationService records FAILED
            throw new RuntimeException("Email send failed: " + e.getMessage(), e);
        }
    }
}
