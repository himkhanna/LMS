package com.lms.assessment.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "question")
public class Question {
    @Id @UuidGenerator private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;
    @Column(columnDefinition = "text", nullable = false) private String prompt;
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "jsonb", nullable = false) private List<String> options;
    @Column(name = "answer_index", nullable = false) private int answerIndex;
    @Column(nullable = false) private int position;

    public UUID getId() { return id; }
    public Quiz getQuiz() { return quiz; } public void setQuiz(Quiz v) { quiz = v; }
    public String getPrompt() { return prompt; } public void setPrompt(String v) { prompt = v; }
    public List<String> getOptions() { return options; } public void setOptions(List<String> v) { options = v; }
    public int getAnswerIndex() { return answerIndex; } public void setAnswerIndex(int v) { answerIndex = v; }
    public int getPosition() { return position; } public void setPosition(int v) { position = v; }
}
