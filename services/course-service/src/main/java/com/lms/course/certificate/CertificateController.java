package com.lms.course.certificate;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CertificateController {

    private final CertificateService service;

    public CertificateController(CertificateService service) {
        this.service = service;
    }

    @GetMapping("/me/certificates")
    public List<CertificateDto> mine(@AuthenticationPrincipal Jwt jwt) {
        return service.listForUser(currentUserId(jwt)).stream()
                .map(CertificateDto::from)
                .toList();
    }

    @GetMapping("/certificates/{id}")
    public CertificateDto get(@PathVariable UUID id,
                              @AuthenticationPrincipal Jwt jwt,
                              Authentication auth) {
        Certificate c = service.get(id);
        ensureViewable(c, jwt, auth);
        return CertificateDto.from(c);
    }

    @GetMapping("/certificates/{id}/pdf")
    public ResponseEntity<ByteArrayResource> pdf(@PathVariable UUID id,
                                                 @AuthenticationPrincipal Jwt jwt,
                                                 Authentication auth) {
        Certificate c = service.get(id);
        ensureViewable(c, jwt, auth);
        byte[] bytes = service.renderPdf(c);
        String filename = "certificate-" + c.getSerial() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(new ByteArrayResource(bytes));
    }

    /** Admin-only manual issue/regenerate path. */
    @org.springframework.web.bind.annotation.PostMapping("/enrollments/{id}/certificate")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public CertificateDto issue(@PathVariable UUID id) {
        // Used to issue a cert manually (e.g. retroactively). Re-issue is a
        // no-op since the table is unique-keyed on enrollment_id.
        // The full enrollment lookup is done in the service.
        throw new UnsupportedOperationException("Manual issue not implemented; certificates auto-issue on completion.");
    }

    private static void ensureViewable(Certificate c, Jwt jwt, Authentication auth) {
        UUID self = jwt != null && jwt.getSubject() != null
                ? UUID.fromString(jwt.getSubject()) : null;
        if (self != null && self.equals(c.getUserId())) return;
        // Allow admin / HR / instructor to view any cert (e.g. for reports)
        if (auth != null) {
            for (var a : auth.getAuthorities()) {
                String n = a.getAuthority();
                if ("ROLE_ADMIN".equals(n) || "ROLE_HR".equals(n) || "ROLE_INSTRUCTOR".equals(n)) {
                    return;
                }
            }
        }
        throw new IllegalArgumentException("Cannot view another user's certificate");
    }

    private static UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new IllegalStateException("Missing authenticated user");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
