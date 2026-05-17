package com.lms.course.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Email delivery for the notification subsystem.
 *
 * <p>Delegates to {@link GraphMailClient} (Microsoft 365 via Microsoft
 * Graph {@code sendMail}) when both:
 * <ul>
 *   <li>{@code app.notify.email.enabled=true} (default)</li>
 *   <li>{@code MS_TENANT_ID} / {@code MS_CLIENT_ID} / {@code MS_CLIENT_SECRET}
 *       are set (same Entra ID app used for OIDC login, with the
 *       {@code Mail.Send} application permission granted)</li>
 *   <li>{@code app.notify.email.from} is set to a licensed mailbox in
 *       the tenant</li>
 * </ul>
 *
 * <p>Otherwise the sender stays in log-only dev mode and the platform
 * still runs the full workflow loop without sending real mail.
 */
@Component
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    private final boolean enabled;
    private final String from;
    private final String fromName;
    private final GraphMailClient graph;

    public EmailSender(@Value("${app.notify.email.enabled:true}") boolean enabled,
                       @Value("${app.notify.email.from:}") String from,
                       @Value("${app.notify.email.from-name:IDC Digital Learning}") String fromName,
                       GraphMailClient graph) {
        this.enabled = enabled;
        this.from = from;
        this.fromName = fromName;
        this.graph = graph;
    }

    /** Returns true on success. Throws on hard delivery failure. */
    public boolean send(String to, String subject, String body) {
        if (to == null || to.isBlank()) return false;
        if (!enabled || from == null || from.isBlank() || !graph.configured()) {
            log.info("[email→{}] (dev/log-only) subject={}", to, subject);
            log.debug("[email body] {}", body);
            return true;
        }
        graph.send(from, to, fromName, subject, body);
        log.info("email sent to={} subject={} via graph", to, subject);
        return true;
    }
}
