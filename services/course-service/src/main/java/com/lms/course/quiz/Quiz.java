package com.lms.course.quiz;

import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.Lesson;
import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quiz")
public class Quiz {

    @Id @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private CourseModule module;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "pass_score", nullable = false)
    private int passScore = 70;

    @Column(name = "time_limit_mins")
    private Integer timeLimitMins;

    @Column(name = "max_attempts")
    private Integer maxAttempts;

    @Column(name = "shuffle_questions", nullable = false)
    private boolean shuffleQuestions = false;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private QuizStatus status = QuizStatus.DRAFT;

    @Column(nullable = false)
    private int position = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<Question> questions = new ArrayList<>();

    @PrePersist void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    @PreUpdate void onUpdate() { this.updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public Course getCourse() { return course; }
    public void setCourse(Course v) { this.course = v; }
    public CourseModule getModule() { return module; }
    public void setModule(CourseModule v) { this.module = v; }
    public Lesson getLesson() { return lesson; }
    public void setLesson(Lesson v) { this.lesson = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public int getPassScore() { return passScore; }
    public void setPassScore(int v) { this.passScore = v; }
    public Integer getTimeLimitMins() { return timeLimitMins; }
    public void setTimeLimitMins(Integer v) { this.timeLimitMins = v; }
    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer v) { this.maxAttempts = v; }
    public boolean isShuffleQuestions() { return shuffleQuestions; }
    public void setShuffleQuestions(boolean v) { this.shuffleQuestions = v; }
    public QuizStatus getStatus() { return status; }
    public void setStatus(QuizStatus v) { this.status = v; }
    public int getPosition() { return position; }
    public void setPosition(int v) { this.position = v; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public List<Question> getQuestions() { return questions; }

    public void addQuestion(Question q) {
        q.setQuiz(this);
        q.setPosition(questions.size());
        questions.add(q);
    }
}
