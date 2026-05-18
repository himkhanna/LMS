package com.lms.course.ai;

import com.lms.course.ai.SlideDeckExtractor.ExtractedSlide;
import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.Lesson;
import com.lms.course.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class MechanicalDeckCourseService {

    private static final int DEFAULT_LESSON_DURATION_SECS = 60;

    private final CourseRepository courses;

    public MechanicalDeckCourseService(CourseRepository courses) {
        this.courses = courses;
    }

    public Course build(String courseTitle, List<ExtractedSlide> slides, Integer lessonsPerModule) {
        ProposedCourse proposed = propose(courseTitle, slides, lessonsPerModule);
        return persist(proposed);
    }

    /**
     * Build the proposed course/module/lesson structure from the deck without
     * persisting. Used by the PPT designer view so HR can preview + edit
     * before committing.
     */
    public ProposedCourse propose(String courseTitle, List<ExtractedSlide> slides, Integer lessonsPerModule) {
        if (slides == null || slides.isEmpty()) {
            throw new IllegalArgumentException("Deck contains no slides");
        }
        int chunkSize = (lessonsPerModule != null && lessonsPerModule > 0) ? lessonsPerModule : 4;

        ProposedCourse course = new ProposedCourse();
        course.title = safe(courseTitle, "Untitled course");
        course.description = slides.get(0).body();

        int moduleIdx = 0;
        for (int i = 0; i < slides.size(); i += chunkSize) {
            moduleIdx++;
            List<ExtractedSlide> chunk = slides.subList(i, Math.min(i + chunkSize, slides.size()));
            ProposedModule m = new ProposedModule();
            m.title = moduleTitle(chunk, moduleIdx);
            int slideIdxInDeck = i;
            for (ExtractedSlide s : chunk) {
                slideIdxInDeck++;
                ProposedLesson l = new ProposedLesson();
                l.title = safe(s.title(), "Slide " + slideIdxInDeck);
                l.content = lessonContent(s);
                l.durationSecs = DEFAULT_LESSON_DURATION_SECS;
                m.lessons.add(l);
            }
            course.modules.add(m);
        }
        return course;
    }

    /** Persist the (possibly edited) proposed structure as a real Course row. */
    public Course persist(ProposedCourse proposed) {
        if (proposed == null) throw new IllegalArgumentException("Missing course structure");
        if (proposed.modules == null || proposed.modules.isEmpty()) {
            throw new IllegalArgumentException("Course must have at least one module");
        }
        Course course = new Course();
        course.setTitle(safe(proposed.title, "Untitled course"));
        course.setDescription(proposed.description);
        for (ProposedModule pm : proposed.modules) {
            CourseModule m = new CourseModule();
            m.setTitle(safe(pm.title, "Module"));
            course.addModule(m);
            if (pm.lessons != null) {
                int slideIdx = 0;
                for (ProposedLesson pl : pm.lessons) {
                    slideIdx++;
                    Lesson l = new Lesson();
                    l.setTitle(safe(pl.title, "Lesson " + slideIdx));
                    l.setContent(pl.content);
                    l.setDurationSecs(pl.durationSecs != null && pl.durationSecs > 0
                            ? pl.durationSecs : DEFAULT_LESSON_DURATION_SECS);
                    m.addLesson(l);
                }
            }
        }
        return courses.save(course);
    }

    private static String moduleTitle(List<ExtractedSlide> chunk, int idx) {
        for (ExtractedSlide s : chunk) {
            if (s.title() != null && !s.title().isBlank()) {
                return s.title();
            }
        }
        return "Part " + idx;
    }

    private static String lessonContent(ExtractedSlide s) {
        StringBuilder out = new StringBuilder();
        if (s.body() != null && !s.body().isBlank()) {
            out.append(s.body().strip());
        }
        if (s.notes() != null && !s.notes().isBlank()) {
            if (out.length() > 0) out.append("\n\n");
            out.append("Speaker notes:\n").append(s.notes().strip());
        }
        return out.length() == 0 ? null : out.toString();
    }

    private static String safe(String s, String fallback) {
        return (s == null || s.isBlank()) ? fallback : s;
    }

    // ---- DTOs shared between extract-only and from-structure flows ----

    public static class ProposedCourse {
        public String title;
        public String description;
        public List<ProposedModule> modules = new ArrayList<>();
    }

    public static class ProposedModule {
        public String title;
        public List<ProposedLesson> lessons = new ArrayList<>();
    }

    public static class ProposedLesson {
        public String title;
        public String content;
        public Integer durationSecs;
    }
}
