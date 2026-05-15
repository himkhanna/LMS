package com.lms.course.repository;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {
    Page<Course> findByStatus(CourseStatus status, Pageable pageable);
}
