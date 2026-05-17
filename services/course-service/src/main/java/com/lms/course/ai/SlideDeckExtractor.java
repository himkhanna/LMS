package com.lms.course.ai;

import org.apache.poi.hslf.usermodel.HSLFShape;
import org.apache.poi.hslf.usermodel.HSLFSlide;
import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.hslf.usermodel.HSLFTextShape;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFNotes;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextShape;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public final class SlideDeckExtractor {

    private static final int MAX_PROMPT_CHARS = 60_000;

    // ZIP / OOXML (.pptx): "PK\003\004"
    private static final byte[] ZIP_MAGIC = {0x50, 0x4B, 0x03, 0x04};
    // OLE2 (.ppt): D0 CF 11 E0 A1 B1 1A E1
    private static final byte[] OLE2_MAGIC = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0,
            (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};

    private SlideDeckExtractor() {}

    public record ExtractedSlide(String title, String body, String notes) {}

    public static List<ExtractedSlide> extract(InputStream raw) throws IOException {
        BufferedInputStream in = new BufferedInputStream(raw);
        in.mark(16);
        byte[] header = new byte[8];
        int read = in.read(header);
        in.reset();

        if (matches(header, read, ZIP_MAGIC)) {
            return extractPptx(in);
        }
        if (matches(header, read, OLE2_MAGIC)) {
            return extractPpt(in);
        }
        throw new IllegalArgumentException(
                "Unsupported file format. Upload a .pptx (modern PowerPoint) or .ppt (legacy) deck.");
    }

    public static String toPromptText(List<ExtractedSlide> slides) {
        StringBuilder out = new StringBuilder();
        int idx = 0;
        for (ExtractedSlide s : slides) {
            idx++;
            out.append("Slide ").append(idx).append(":\n");
            if (s.title() != null && !s.title().isBlank()) {
                out.append(s.title().strip()).append('\n');
            }
            if (s.body() != null && !s.body().isBlank()) {
                out.append(s.body().strip()).append('\n');
            }
            if (s.notes() != null && !s.notes().isBlank()) {
                out.append("[notes] ").append(s.notes().strip()).append('\n');
            }
            out.append('\n');
            if (out.length() > MAX_PROMPT_CHARS) {
                out.setLength(MAX_PROMPT_CHARS);
                out.append("\n... [truncated]\n");
                break;
            }
        }
        return out.toString();
    }

    private static boolean matches(byte[] header, int read, byte[] magic) {
        if (read < magic.length) return false;
        for (int i = 0; i < magic.length; i++) {
            if (header[i] != magic[i]) return false;
        }
        return true;
    }

    private static List<ExtractedSlide> extractPptx(InputStream in) throws IOException {
        List<ExtractedSlide> out = new ArrayList<>();
        try (XMLSlideShow ppt = new XMLSlideShow(in)) {
            for (XSLFSlide slide : ppt.getSlides()) {
                String title = slide.getTitle();
                StringBuilder body = new StringBuilder();
                for (XSLFShape shape : slide.getShapes()) {
                    if (shape instanceof XSLFTextShape ts) {
                        String text = ts.getText();
                        if (text == null || text.isBlank()) continue;
                        if (title != null && text.strip().equals(title.strip())) continue;
                        body.append(text.strip()).append('\n');
                    }
                }
                StringBuilder notes = new StringBuilder();
                XSLFNotes n = slide.getNotes();
                if (n != null) {
                    for (XSLFShape shape : n.getShapes()) {
                        if (shape instanceof XSLFTextShape ts) {
                            String text = ts.getText();
                            if (text != null && !text.isBlank()) {
                                notes.append(text.strip()).append('\n');
                            }
                        }
                    }
                }
                out.add(new ExtractedSlide(
                        nullIfBlank(title),
                        nullIfBlank(body.toString()),
                        nullIfBlank(notes.toString())));
            }
        }
        return out;
    }

    private static List<ExtractedSlide> extractPpt(InputStream in) throws IOException {
        try (POIFSFileSystem fs = new POIFSFileSystem(in)) {
            var root = fs.getRoot();
            if (root.hasEntry("EncryptedPackage")) {
                throw new IllegalArgumentException(
                        "This presentation is encrypted and cannot be read on the server. This"
                                + " usually means either (a) a password is set, or (b) a corporate"
                                + " sensitivity label / IRM (Information Rights Management) is"
                                + " applied. To upload, open the deck in PowerPoint and either"
                                + " remove the password (File → Info → Protect Presentation), remove"
                                + " the sensitivity label (File → Info → Sensitivity), or copy all"
                                + " slides into a new blank deck and save that.");
            }
            if (!root.hasEntry("PowerPoint Document")) {
                throw new IllegalArgumentException(
                        "This file is an OLE2 container but does not contain a PowerPoint document"
                                + " stream. It may be corrupt or a non-PowerPoint Office file.");
            }
            return extractPptFromPOIFS(fs);
        }
    }

    private static List<ExtractedSlide> extractPptFromPOIFS(POIFSFileSystem fs) throws IOException {
        List<ExtractedSlide> out = new ArrayList<>();
        try (HSLFSlideShow ppt = new HSLFSlideShow(fs)) {
            for (HSLFSlide slide : ppt.getSlides()) {
                String title = slide.getTitle();
                StringBuilder body = new StringBuilder();
                for (HSLFShape shape : slide.getShapes()) {
                    if (shape instanceof HSLFTextShape ts) {
                        String text = ts.getText();
                        if (text == null || text.isBlank()) continue;
                        if (title != null && text.strip().equals(title.strip())) continue;
                        body.append(text.strip()).append('\n');
                    }
                }
                StringBuilder notes = new StringBuilder();
                var n = slide.getNotes();
                if (n != null) {
                    for (HSLFShape shape : n.getShapes()) {
                        if (shape instanceof HSLFTextShape ts) {
                            String text = ts.getText();
                            if (text != null && !text.isBlank()) {
                                notes.append(text.strip()).append('\n');
                            }
                        }
                    }
                }
                out.add(new ExtractedSlide(
                        nullIfBlank(title),
                        nullIfBlank(body.toString()),
                        nullIfBlank(notes.toString())));
            }
        }
        return out;
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s.strip();
    }
}
