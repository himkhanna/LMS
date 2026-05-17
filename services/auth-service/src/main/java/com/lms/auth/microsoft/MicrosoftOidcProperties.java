package com.lms.auth.microsoft;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Microsoft Entra ID configuration for OIDC login + role mapping.
 *
 * <h2>App registration setup (required)</h2>
 * <ol>
 *   <li>Create an app registration in your tenant.</li>
 *   <li>Authentication → add the Single-page application platform with redirect URI
 *       {@code http://localhost:3000/auth/callback} (and the prod URL). Enable
 *       ID token issuance.</li>
 *   <li>Certificates &amp; secrets → create a client secret.</li>
 *   <li>API permissions → Microsoft Graph delegated {@code openid},
 *       {@code profile}, {@code email}. For mail send (course-service
 *       GraphMailClient) also add {@code Mail.Send} Application permission
 *       and grant admin consent.</li>
 * </ol>
 *
 * <h2>App roles (recommended for role mapping)</h2>
 * <p>On the app registration → <em>App roles</em>, declare three roles
 * with these {@code value}s:
 * <ul>
 *   <li>{@code LMS_ADMIN}</li>
 *   <li>{@code LMS_HR}</li>
 *   <li>{@code LMS_INSTRUCTOR}</li>
 * </ul>
 * (Anyone else logging in stays {@code USER}.) Use the same names as
 * {@link com.lms.auth.domain.AppUser.Role} prefixed with
 * {@code app.auth.microsoft.app-role-prefix} (default {@code LMS_}).
 *
 * <p>Then go to <em>Enterprise applications → your app → Users and groups</em>
 * and assign individual users or security groups to the relevant role.
 *
 * <h2>Group membership (alternative or supplement)</h2>
 * <p>To drive roles from existing Entra security groups, set:
 * <ul>
 *   <li>{@code MS_GROUP_ADMIN=<group-object-id>}</li>
 *   <li>{@code MS_GROUP_HR=<group-object-id>}</li>
 *   <li>{@code MS_GROUP_INSTRUCTOR=<group-object-id>}</li>
 * </ul>
 * and edit the app's manifest to include the {@code groups} claim
 * ({@code "groupMembershipClaims": "SecurityGroup"}). App roles take
 * precedence when both are present.
 *
 * <h2>Sync mode</h2>
 * <p>{@code app.auth.microsoft.role-sync=true} (default) — each login
 * refreshes the user's role from Entra claims if any role/group claim is
 * present. Set to {@code false} to ignore Entra claims and manage roles
 * purely in-app via /admin/users.
 */
@ConfigurationProperties(prefix = "app.auth.microsoft")
public class MicrosoftOidcProperties {

    private String tenantId;
    private String clientId;
    private String clientSecret;
    private String appRolePrefix = "LMS_";
    private boolean roleSync = true;
    private String groupAdmin;
    private String groupHr;
    private String groupInstructor;

    public String authorityFor(String tid) {
        return "https://login.microsoftonline.com/" + tid;
    }

    public String tokenEndpoint() {
        return authorityFor(tenantId) + "/oauth2/v2.0/token";
    }

    public String jwksUri(String tid) {
        return authorityFor(tid) + "/discovery/v2.0/keys";
    }

    public String expectedIssuer(String tid) {
        return authorityFor(tid) + "/v2.0";
    }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }
    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }
    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
    public String getAppRolePrefix() { return appRolePrefix; }
    public void setAppRolePrefix(String v) { this.appRolePrefix = v == null ? "" : v; }
    public boolean isRoleSync() { return roleSync; }
    public void setRoleSync(boolean v) { this.roleSync = v; }
    public String getGroupAdmin() { return groupAdmin; }
    public void setGroupAdmin(String v) { this.groupAdmin = v; }
    public String getGroupHr() { return groupHr; }
    public void setGroupHr(String v) { this.groupHr = v; }
    public String getGroupInstructor() { return groupInstructor; }
    public void setGroupInstructor(String v) { this.groupInstructor = v; }
}
