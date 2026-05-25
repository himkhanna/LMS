package com.lms.course.quiz;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "question")
public class Question {

    @Id @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private QuestionType type;

    @Column(columnDefinition = "text", nullable = false)
    private String prompt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> options;

    /**
     * Stored as a heterogeneous JSON array; semantics depend on {@link #type}:
     * MCQ_SINGLE / MCQ_MULTI : indices into {@link #options}, as Integers
     * TRUE_FALSE             : one-element list containing Boolean
     * SHORT_ANSWER           : list of acceptable strings (case-insensitive match)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<Object> correct;

    @Column(nullable = false)
    private int points = 1;

    @Column(columnDefinition = "text")
    private String explanation;

    /** Free-text topic / category (e.g. "Phishing & Social Engineering")
     *  used for analytics grouping and import metadata. */
    @Column(length = 128)
    private String topic;

    @Column(nullable = false)
    private int position;

    public UUID getId() { return id; }
    public Quiz getQuiz() { return quiz; }
    public void setQuiz(Quiz v) { this.quiz = v; }
    public QuestionType getType() { return type; }
    public void setType(QuestionType v) { this.type = v; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String v) { this.prompt = v; }
    public List<String> getOptions() { return options; }
    public void setOptions(List<String> v) { this.options = v; }
    public List<Object> getCorrect() { return correct; }
    public void setCorrect(List<Object> v) { this.correct = v; }
    public int getPoints() { return points; }
    public void setPoints(int v) { this.points = v; }
    public String getExplanation() { return explanation; }
    public void setExplanation(String v) { this.explanation = v; }
    public String getTopic() { return topic; }
    public void setTopic(String v) {
        this.topic = v == null || v.isBlank() ? null : v.trim();
    }
    public int getPosition() { return position; }
    public void setPosition(int v) { this.position = v; }
}
