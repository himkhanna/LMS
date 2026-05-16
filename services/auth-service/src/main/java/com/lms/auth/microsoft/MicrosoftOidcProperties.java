package com.lms.auth.microsoft;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.microsoft")
public class MicrosoftOidcProperties {

    private String tenantId;
    private String clientId;
    private String clientSecret;

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
}
