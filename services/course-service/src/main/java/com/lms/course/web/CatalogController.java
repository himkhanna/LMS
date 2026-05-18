package com.lms.course.web;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseStatus;
import com.lms.course.repository.CourseRepository;
import com.lms.course.web.dto.CourseDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Browse-able catalog of PUBLISHED courses. Any authenticated user can
 * read; HR/admin still author through the existing CRUD endpoints.
 */
@RestController
@RequestMapping("/api/v1/catalog")
@Transactional(readOnly = true)
public class CatalogController {

    @PersistenceContext
    private EntityManager em;

    private final CourseRepository courses;

    public CatalogController(CourseRepository courses) {
        this.courses = courses;
    }

    public record CatalogResult(List<CourseDto> courses, List<String> tags) {}

    @GetMapping("/courses")
    public CatalogResult list(@RequestParam(required = false) String q,
                              @RequestParam(required = false) String tag) {
        TypedQuery<Course> query;
        if (tag != null && !tag.isBlank()) {
            query = em.createQuery("""
                            SELECT c FROM Course c
                            WHERE c.status = com.lms.course.domain.CourseStatus.PUBLISHED
                              AND :tag MEMBER OF c.tags
                            ORDER BY c.publishedAt DESC NULLS LAST, c.title ASC
                            """, Course.class)
                    .setParameter("tag", tag);
        } else {
            query = em.createQuery("""
                            SELECT c FROM Course c
                            WHERE c.status = com.lms.course.domain.CourseStatus.PUBLISHED
                            ORDER BY c.publishedAt DESC NULLS LAST, c.title ASC
                            """, Course.class);
        }
        List<Course> all = query.setMaxResults(500).getResultList();

        // In-memory filter for free-text search across title / summary / description / tags
        List<Course> filtered;
        if (q != null && !q.isBlank()) {
            String needle = q.toLowerCase(Locale.ENGLISH).trim();
            filtered = new ArrayList<>();
            for (Course c : all) {
                if (containsCI(c.getTitle(), needle)
                        || containsCI(c.getSummary(), needle)
                        || containsCI(c.getDescription(), needle)
                        || matchesAnyTagCI(c.getTags(), needle)) {
                    filtered.add(c);
                }
            }
        } else {
            filtered = all;
        }

        Set<String> tagSet = new LinkedHashSet<>();
        for (Course c : all) {
            for (String t : c.getTags()) {
                if (t != null && !t.isBlank()) tagSet.add(t);
            }
        }

        return new CatalogResult(
                filtered.stream().map(CourseDto::summary).toList(),
                new ArrayList<>(tagSet)
        );
    }

    private static boolean containsCI(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase(Locale.ENGLISH).contains(needle);
    }

    private static boolean matchesAnyTagCI(List<String> tags, String needle) {
        if (tags == null) return false;
        for (String t : tags) {
            if (containsCI(t, needle)) return true;
        }
        return false;
    }
}
