package com.lms.course.certificate;

import com.lms.course.enrollment.Enrollment;
import com.lms.course.service.CourseNotFoundException;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class CertificateService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH);

    private final CertificateRepository certificates;
    private final String orgName;
    private final String orgTagline;

    public CertificateService(CertificateRepository certificates,
                              @Value("${app.cert.org-name:IDC Digital}") String orgName,
                              @Value("${app.cert.org-tagline:Transforming Your Business}") String orgTagline) {
        this.certificates = certificates;
        this.orgName = orgName;
        this.orgTagline = orgTagline;
    }

    /**
     * Issue a certificate for a completed enrollment, or return the existing
     * one. Safe to call multiple times — idempotent on {@code enrollment_id}.
     */
    public Certificate issueIfMissing(Enrollment e) {
        return certificates.findByEnrollmentId(e.getId()).orElseGet(() -> {
            Certificate c = new Certificate();
            c.setEnrollmentId(e.getId());
            c.setUserId(e.getUserId());
            c.setUserEmail(e.getUserEmail());
            c.setUserName(e.getUserName());
            c.setCourseId(e.getCourse().getId());
            c.setCourseTitle(e.getCourse().getTitle());
            c.setSerial(buildSerial());
            return certificates.save(c);
        });
    }

    @Transactional(readOnly = true)
    public Certificate get(UUID id) {
        return certificates.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Certificate", id));
    }

    @Transactional(readOnly = true)
    public List<Certificate> listForUser(UUID userId) {
        return certificates.findByUserIdOrderByIssuedAtDesc(userId);
    }

    /** Render a one-page landscape A4 certificate as a PDF byte array. */
    public byte[] renderPdf(Certificate c) {
        try {
            Document document = new Document(PageSize.A4.rotate(), 48, 48, 48, 48);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.open();

            PdfContentByte canvas = writer.getDirectContent();
            Rectangle page = document.getPageSize();

            // Outer border
            canvas.setColorStroke(new Color(0x0a, 0x1e, 0x44));
            canvas.setLineWidth(3);
            canvas.rectangle(28, 28, page.getWidth() - 56, page.getHeight() - 56);
            canvas.stroke();
            // Inner double-line border
            canvas.setLineWidth(1);
            canvas.rectangle(38, 38, page.getWidth() - 76, page.getHeight() - 76);
            canvas.stroke();
            // Accent bar across top
            canvas.setColorFill(new Color(0x1e, 0x63, 0xf2));
            canvas.rectangle(28, page.getHeight() - 96, page.getWidth() - 56, 8);
            canvas.fill();

            // Org name banner
            Font orgFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 28, new Color(0x0a, 0x1e, 0x44));
            Paragraph org = new Paragraph(orgName, orgFont);
            org.setAlignment(Element.ALIGN_CENTER);
            org.setSpacingBefore(40);
            document.add(org);

            Font tagFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 11, new Color(0x5b, 0x6b, 0x86));
            Paragraph tag = new Paragraph(orgTagline.toUpperCase(Locale.ENGLISH), tagFont);
            tag.setAlignment(Element.ALIGN_CENTER);
            document.add(tag);

            // Title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 36, new Color(0x0f, 0x1f, 0x3d));
            Paragraph title = new Paragraph("Certificate of Completion", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingBefore(40);
            document.add(title);

            // "This certifies that"
            Font lblFont = FontFactory.getFont(FontFactory.HELVETICA, 13, new Color(0x5b, 0x6b, 0x86));
            Paragraph lbl = new Paragraph("This certifies that", lblFont);
            lbl.setAlignment(Element.ALIGN_CENTER);
            lbl.setSpacingBefore(24);
            document.add(lbl);

            // Learner name
            Font nameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 30, new Color(0x1e, 0x63, 0xf2));
            String learnerLabel = c.getUserName() != null && !c.getUserName().isBlank()
                    ? c.getUserName()
                    : c.getUserEmail();
            Paragraph name = new Paragraph(learnerLabel, nameFont);
            name.setAlignment(Element.ALIGN_CENTER);
            name.setSpacingBefore(12);
            document.add(name);

            // "has successfully completed the course"
            Paragraph completed = new Paragraph("has successfully completed the course", lblFont);
            completed.setAlignment(Element.ALIGN_CENTER);
            completed.setSpacingBefore(16);
            document.add(completed);

            // Course title
            Font courseFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(0x0f, 0x1f, 0x3d));
            Paragraph course = new Paragraph("\"" + c.getCourseTitle() + "\"", courseFont);
            course.setAlignment(Element.ALIGN_CENTER);
            course.setSpacingBefore(12);
            document.add(course);

            // Date
            Paragraph date = new Paragraph("on " + DATE_FMT.format(c.getIssuedAt()), lblFont);
            date.setAlignment(Element.ALIGN_CENTER);
            date.setSpacingBefore(28);
            document.add(date);

            // Footer with serial
            Font footFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(0x5b, 0x6b, 0x86));
            Phrase footer = new Phrase("Verification ID: " + c.getSerial(), footFont);
            canvas.beginText();
            canvas.setFontAndSize(FontFactory.getFont(FontFactory.HELVETICA).getBaseFont(), 9);
            canvas.setColorFill(new Color(0x5b, 0x6b, 0x86));
            canvas.showTextAligned(Element.ALIGN_CENTER, "Verification ID: " + c.getSerial(),
                    page.getWidth() / 2, 60, 0);
            canvas.endText();

            document.close();
            return out.toByteArray();
        } catch (DocumentException ex) {
            throw new RuntimeException("Failed to render certificate PDF", ex);
        }
    }

    private static String buildSerial() {
        // Human-friendly verification code: IDC-YYYY-XXXXXXXX
        String hex = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ENGLISH);
        int year = java.time.Year.now().getValue();
        return "IDC-" + year + "-" + hex;
    }
}
