package com.lms.course.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Pluggable email delivery surface. The default impl just logs the
 * message and returns success — wires the platform end-to-end without
 * requiring SMTP credentials in dev. Swap this out (or set app.notify.
 * email.enabled=false) when integrating a real provider.
 */
@Component
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    private final boolean enabled;
    private final String from;

    public EmailSender(@Value("${app.notify.email.enabled:true}") boolean enabled,
                       @Value("${app.notify.email.from:learning@idcdigital.local}") String from) {
        this.enabled = enabled;
        this.from = from;
    }

    /**
     * Returns true on successful delivery (or simulated delivery in dev).
     * Throws if delivery hard-failed.
     */
    public boolean send(String to, String subject, String body) {
        if (!enabled) {
            log.debug("email disabled — would have sent to={} subject={}", to, subject);
            return true;
        }
        // Dev-default: log and return. Replace with JavaMailSender / SendGrid
        // client when wiring a real SMTP provider.
        log.info("[email→{}] from={} subject={}", to, from, subject);
        log.debug("[email body] {}", body);
        return true;
    }
}
