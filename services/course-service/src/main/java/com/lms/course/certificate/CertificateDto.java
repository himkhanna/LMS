package com.lms.course.certificate;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CertificateDto(
        UUID id,
        UUID enrollmentId,
        UUID courseId,
        String courseTitle,
        UUID userId,
        String userEmail,
        String userName,
        OffsetDateTime issuedAt,
        String serial
) {
    public static CertificateDto from(Certificate c) {
        return new CertificateDto(
                c.getId(), c.getEnrollmentId(),
                c.getCourseId(), c.getCourseTitle(),
                c.getUserId(), c.getUserEmail(), c.getUserName(),
                c.getIssuedAt(), c.getSerial());
    }
}
