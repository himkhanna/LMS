package com.lms.course.ai;

import com.lms.course.ai.SlideDeckExtractor.ExtractedSlide;
import com.lms.course.ai.SlideDeckRenderer.RenderedSlide;
import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.Lesson;
import com.lms.course.repository.CourseRepository;
import com.lms.course.storage.ObjectStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.UUID;

/**
 * Builds a course where each slide of an uploaded deck becomes a lesson
 * displaying the rendered slide image (not just the extracted text).
 * The PNG is persisted to ObjectStorage under a stable key and embedded
 * in the lesson's HTML content via the public /api/v1/assets/files/...
 * route so it loads without auth.
 */
@Service
@Transactional
public class SlideshowCourseService {

    private static final int DEFAULT_LESSON_DURATION_SECS = 30;

    private final CourseRepository courses;
    private final ObjectStorage storage;

    public SlideshowCourseService(CourseRepository courses, ObjectStorage storage) {
        this.courses = courses;
        this.storage = storage;
    }

    public Course build(String courseTitle,
                        List<ExtractedSlide> extracted,
                        List<RenderedSlide> rendered,
                        Integer slidesPerModule,
                        Integer secsPerSlide) {
        if (rendered == null || rendered.isEmpty()) {
            throw new IllegalArgumentException("Deck contains no renderable slides");
        }
        int chunkSize = (slidesPerModule != null && slidesPerModule > 0) ? slidesPerModule : 5;
        int duration = (secsPerSlide != null && secsPerSlide > 0) ? secsPerSlide : DEFAULT_LESSON_DURATION_SECS;
        int slideCount = rendered.size();
        boolean haveText = extracted != null && !extracted.isEmpty();

        Course course = new Course();
        course.setTitle(safe(courseTitle, "Untitled course"));
        if (haveText && extracted.get(0).body() != null) {
            course.setDescription(extracted.get(0).body());
        }
        // Tag automatically so it shows up in the catalog with a sensible label
        course.getTags().add("slideshow");

        // Persist images first under a stable course-scoped prefix so the
        // file URLs include the course id (handy for debugging + cleanup).
        UUID coursePlaceholderId = UUID.randomUUID();
        String prefix = "decks/" + coursePlaceholderId;

        int moduleIdx = 0;
        for (int i = 0; i < slideCount; i += chunkSize) {
            moduleIdx++;
            int end = Math.min(i + chunkSize, slideCount);
            CourseModule m = new CourseModule();
            m.setTitle(moduleTitle(extracted, i, end, moduleIdx));
            course.addModule(m);
            for (int j = i; j < end; j++) {
                RenderedSlide r = rendered.get(j);
                ExtractedSlide s = (haveText && j < extracted.size()) ? extracted.get(j) : null;
                String key = "%s/slide-%03d.png".formatted(prefix, j + 1);
                storage.put(key, new ByteArrayInputStream(r.png()), r.png().length, "image/png");

                Lesson l = new Lesson();
                l.setTitle(lessonTitle(s, j + 1));
                l.setContent(lessonHtml(key, s));
                l.setDurationSecs(duration);
                m.addLesson(l);
            }
        }
        return courses.save(course);
    }

    private static String moduleTitle(List<ExtractedSlide> extracted, int from, int toExclusive, int idx) {
        if (extracted != null) {
            for (int k = from; k < toExclusive && k < extracted.size(); k++) {
                String t = extracted.get(k).title();
                if (t != null && !t.isBlank()) return t;
            }
        }
        return "Part " + idx;
    }

    private static String lessonTitle(ExtractedSlide s, int slideNumber) {
        if (s != null && s.title() != null && !s.title().isBlank()) return s.title();
        return "Slide " + slideNumber;
    }

    /**
     * Build the HTML body. Image first (so it dominates the slideshow
     * view), then any speaker notes the deck included. The image URL
     * points at the public /api/v1/assets/files/... route — no auth,
     * no expiry, served by LocalAssetController.
     */
    private static String lessonHtml(String storageKey, ExtractedSlide s) {
        StringBuilder html = new StringBuilder();
        html.append("<p><img src=\"/api/v1/assets/files/")
                .append(storageKey)
                .append("\" alt=\"Slide\" style=\"max-width:100%;height:auto;border-radius:8px\"/></p>");
        if (s != null && s.notes() != null && !s.notes().isBlank()) {
            html.append("<details><summary>Speaker notes</summary>")
                    .append("<p>")
                    .append(escapeHtml(s.notes().strip()).replace("\n", "<br/>"))
                    .append("</p></details>");
        }
        return html.toString();
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String safe(String s, String fallback) {
        return (s == null || s.isBlank()) ? fallback : s;
    }
}
