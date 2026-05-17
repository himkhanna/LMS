package com.lms.course.ai;

import com.lms.course.ai.SlideDeckExtractor.ExtractedSlide;
import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.Lesson;
import com.lms.course.repository.CourseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        if (slides == null || slides.isEmpty()) {
            throw new IllegalArgumentException("Deck contains no slides");
        }
        int chunkSize = (lessonsPerModule != null && lessonsPerModule > 0) ? lessonsPerModule : 4;

        Course course = new Course();
        course.setTitle(safe(courseTitle, "Untitled course"));
        if (slides.get(0).body() != null) {
            course.setDescription(slides.get(0).body());
        }

        int moduleIdx = 0;
        for (int i = 0; i < slides.size(); i += chunkSize) {
            moduleIdx++;
            List<ExtractedSlide> chunk = slides.subList(i, Math.min(i + chunkSize, slides.size()));
            CourseModule m = new CourseModule();
            m.setTitle(moduleTitle(chunk, moduleIdx));
            course.addModule(m);
            int slideIdxInDeck = i;
            for (ExtractedSlide s : chunk) {
                slideIdxInDeck++;
                Lesson l = new Lesson();
                l.setTitle(safe(s.title(), "Slide " + slideIdxInDeck));
                l.setContent(lessonContent(s));
                l.setDurationSecs(DEFAULT_LESSON_DURATION_SECS);
                m.addLesson(l);
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
}
