package com.lms.course.path;

import com.lms.course.domain.Course;
import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "learning_path_course")
public class LearningPathCourse {

    @Id @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "path_id", nullable = false)
    private LearningPath path;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private boolean required = true;

    public UUID getId() { return id; }
    public LearningPath getPath() { return path; }
    public void setPath(LearningPath v) { this.path = v; }
    public Course getCourse() { return course; }
    public void setCourse(Course v) { this.course = v; }
    public int getPosition() { return position; }
    public void setPosition(int v) { this.position = v; }
    public boolean isRequired() { return required; }
    public void setRequired(boolean v) { this.required = v; }
}
