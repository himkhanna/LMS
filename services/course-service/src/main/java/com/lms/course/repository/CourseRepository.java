package com.lms.course.repository;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {

    Page<Course> findByStatus(CourseStatus status, Pageable pageable);

    @Query(value = """
            SELECT c.* FROM course c
            WHERE c.search_vector @@ plainto_tsquery('english', :q)
            ORDER BY ts_rank(c.search_vector, plainto_tsquery('english', :q)) DESC
            """,
            countQuery = """
            SELECT count(*) FROM course c
            WHERE c.search_vector @@ plainto_tsquery('english', :q)
            """,
            nativeQuery = true)
    Page<Course> search(@Param("q") String query, Pageable pageable);
}
