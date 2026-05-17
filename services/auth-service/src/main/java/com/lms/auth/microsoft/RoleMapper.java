package com.lms.auth.microsoft;

import com.lms.auth.domain.AppUser;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Resolves Microsoft Entra claims into an {@link AppUser.Role}.
 *
 * <p>Priority (highest wins): {@code ADMIN > HR > INSTRUCTOR > USER}.
 *
 * <p>Checked in this order — first match wins per priority level:
 * <ol>
 *   <li>App role on the registration whose value matches
 *       {@code <appRolePrefix><ROLE_NAME>}, e.g. {@code LMS_ADMIN}.</li>
 *   <li>Entra group ID matching one of the {@code group-*} env vars on
 *       {@link MicrosoftOidcProperties}.</li>
 * </ol>
 *
 * <p>Returns {@link Optional#empty()} when no role-relevant claim is
 * present at all — caller decides whether to leave the user's existing
 * role alone (recommended) or default to USER.
 */
@Component
public class RoleMapper {

    private final MicrosoftOidcProperties props;

    public RoleMapper(MicrosoftOidcProperties props) {
        this.props = props;
    }

    public Optional<AppUser.Role> resolve(MicrosoftOidcService.IdTokenClaims claims) {
        if (claims == null) return Optional.empty();
        List<String> roleStrings = claims.roles() == null ? List.of() : claims.roles();
        List<String> groupIds = claims.groups() == null ? List.of() : claims.groups();
        if (roleStrings.isEmpty() && groupIds.isEmpty()) {
            return Optional.empty();
        }

        // Normalize app-role claim values, stripping the prefix.
        String prefix = props.getAppRolePrefix() == null ? "" : props.getAppRolePrefix().toUpperCase(Locale.ENGLISH);
        boolean hasAdmin = hasRole(roleStrings, prefix, "ADMIN") || matchesGroup(groupIds, props.getGroupAdmin());
        boolean hasHr = hasRole(roleStrings, prefix, "HR") || matchesGroup(groupIds, props.getGroupHr());
        boolean hasInstructor = hasRole(roleStrings, prefix, "INSTRUCTOR")
                || matchesGroup(groupIds, props.getGroupInstructor());

        if (hasAdmin) return Optional.of(AppUser.Role.ADMIN);
        if (hasHr) return Optional.of(AppUser.Role.HR);
        if (hasInstructor) return Optional.of(AppUser.Role.INSTRUCTOR);
        return Optional.of(AppUser.Role.USER);
    }

    private static boolean hasRole(List<String> tokenRoles, String prefix, String role) {
        String target = (prefix + role).toUpperCase(Locale.ENGLISH);
        // Also accept the bare role name without prefix, for tenants that
        // don't want the LMS_ prefix on their app roles.
        String bare = role.toUpperCase(Locale.ENGLISH);
        for (String r : tokenRoles) {
            if (r == null) continue;
            String upper = r.toUpperCase(Locale.ENGLISH);
            if (upper.equals(target) || upper.equals(bare)) return true;
        }
        return false;
    }

    private static boolean matchesGroup(List<String> tokenGroups, String configured) {
        if (configured == null || configured.isBlank()) return false;
        for (String g : tokenGroups) {
            if (g != null && g.equalsIgnoreCase(configured)) return true;
        }
        return false;
    }
}
