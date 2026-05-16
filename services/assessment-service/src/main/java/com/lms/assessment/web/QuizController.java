package com.lms.assessment.web;

import com.lms.assessment.domain.Attempt;
import com.lms.assessment.domain.Question;
import com.lms.assessment.domain.Quiz;
import com.lms.assessment.repository.AttemptRepository;
import com.lms.assessment.repository.QuizRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Transactional
public class QuizController {

    private final QuizRepository quizzes;
    private final AttemptRepository attempts;

    public QuizController(QuizRepository quizzes, AttemptRepository attempts) {
        this.quizzes = quizzes; this.attempts = attempts;
    }

    @GetMapping("/quizzes")
    public List<Quiz> list(@RequestParam(required = false) UUID courseId) {
        return courseId == null ? quizzes.findAll() : quizzes.findByCourseId(courseId);
    }

    @GetMapping("/quizzes/{id}")
    public Quiz get(@PathVariable UUID id) { return quizzes.findById(id).orElseThrow(); }

    @PostMapping("/quizzes")
    public ResponseEntity<Quiz> create(@Valid @RequestBody CreateQuiz req) {
        Quiz q = new Quiz();
        q.setTitle(req.title()); q.setDescription(req.description()); q.setCourseId(req.courseId());
        if (req.passScore() != null) q.setPassScore(req.passScore());
        return ResponseEntity.status(201).body(quizzes.save(q));
    }

    @PostMapping("/quizzes/{id}/questions")
    public Question addQuestion(@PathVariable UUID id, @Valid @RequestBody AddQuestion req) {
        Quiz quiz = quizzes.findById(id).orElseThrow();
        Question q = new Question();
        q.setPrompt(req.prompt()); q.setOptions(req.options()); q.setAnswerIndex(req.answerIndex());
        quiz.addQuestion(q);
        quizzes.flush();
        return q;
    }

    @PostMapping("/quizzes/{id}/attempts")
    public Attempt start(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        Attempt a = new Attempt();
        a.setQuizId(id);
        a.setUserId(jwt.getSubject());
        return attempts.save(a);
    }

    @PostMapping("/attempts/{id}/submit")
    public Attempt submit(@PathVariable UUID id, @RequestBody SubmitAttempt req) {
        Attempt a = attempts.findById(id).orElseThrow();
        Quiz q = quizzes.findById(a.getQuizId()).orElseThrow();
        int correct = 0;
        for (Question question : q.getQuestions()) {
            Integer ans = req.answers().get(question.getId().toString());
            if (ans != null && ans == question.getAnswerIndex()) correct++;
        }
        int total = q.getQuestions().size();
        int score = total == 0 ? 0 : (correct * 100 / total);
        a.setScore(score);
        a.setPassed(score >= q.getPassScore());
        a.setSubmittedAt(OffsetDateTime.now());
        return a;
    }

    public record CreateQuiz(@NotBlank String title, String description, UUID courseId, Integer passScore) {}
    public record AddQuestion(@NotBlank String prompt, List<String> options, int answerIndex) {}
    public record SubmitAttempt(Map<String, Integer> answers) {}
}
