package com.lms.auth.web;

import com.lms.auth.microsoft.MicrosoftOidcProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only admin view of the Entra ID configuration the auth-service is
 * actually using. Useful for confirming env vars are wired through and
 * roles will map as expected. Secrets are never echoed back.
 */
@RestController
@RequestMapping("/api/v1/admin/auth")
public class AuthConfigController {

    private final MicrosoftOidcProperties props;

    public AuthConfigController(MicrosoftOidcProperties props) {
        this.props = props;
    }

    @GetMapping("/microsoft")
    public MicrosoftConfigView microsoftConfig() {
        return new MicrosoftConfigView(
                props.getTenantId(),
                props.getClientId(),
                props.getClientSecret() != null && !props.getClientSecret().isBlank(),
                props.isRoleSync(),
                props.getAppRolePrefix(),
                notBlank(props.getGroupAdmin()),
                notBlank(props.getGroupHr()),
                notBlank(props.getGroupInstructor())
        );
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    /**
     * Note: only booleans for group GUIDs — knowing whether they're set
     * is enough for HR/admins, and the actual GUIDs are an Entra-side
     * concern that doesn't need to be echoed back.
     */
    public record MicrosoftConfigView(
            String tenantId,
            String clientId,
            boolean clientSecretConfigured,
            boolean roleSyncEnabled,
            String appRolePrefix,
            boolean adminGroupConfigured,
            boolean hrGroupConfigured,
            boolean instructorGroupConfigured
    ) {}
}
