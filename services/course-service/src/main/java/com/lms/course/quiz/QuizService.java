package com.lms.course.quiz;

import com.lms.course.domain.Course;
import com.lms.course.enrollment.EnrollmentService;
import com.lms.course.repository.CourseModuleRepository;
import com.lms.course.repository.CourseRepository;
import com.lms.course.repository.LessonRepository;
import com.lms.course.service.CourseNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class QuizService {

    private final QuizRepository quizzes;
    private final QuestionRepository questions;
    private final AttemptRepository attempts;
    private final CourseRepository courses;
    private final CourseModuleRepository modules;
    private final LessonRepository lessons;
    private final EnrollmentService enrollments;

    public QuizService(QuizRepository quizzes,
                       QuestionRepository questions,
                       AttemptRepository attempts,
                       CourseRepository courses,
                       CourseModuleRepository modules,
                       LessonRepository lessons,
                       @Lazy @Autowired EnrollmentService enrollments) {
        this.quizzes = quizzes;
        this.questions = questions;
        this.attempts = attempts;
        this.courses = courses;
        this.modules = modules;
        this.lessons = lessons;
        this.enrollments = enrollments;
    }

    public Quiz create(UUID courseId, QuizRequests.CreateQuiz req) {
        Course course = courses.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course", courseId));
        Quiz q = new Quiz();
        q.setCourse(course);
        q.setTitle(req.title().trim());
        q.setDescription(req.description());
        if (req.moduleId() != null) {
            q.setModule(modules.findById(req.moduleId())
                    .orElseThrow(() -> new CourseNotFoundException("Module", req.moduleId())));
        }
        if (req.lessonId() != null) {
            q.setLesson(lessons.findById(req.lessonId())
                    .orElseThrow(() -> new CourseNotFoundException("Lesson", req.lessonId())));
        }
        if (req.passScore() != null) q.setPassScore(req.passScore());
        q.setTimeLimitMins(req.timeLimitMins());
        q.setMaxAttempts(req.maxAttempts());
        q.setShuffleQuestions(Boolean.TRUE.equals(req.shuffleQuestions()));
        q.setPosition(quizzes.findByCourseIdOrderByPositionAsc(courseId).size());
        return quizzes.save(q);
    }

    public Quiz update(UUID id, QuizRequests.UpdateQuiz req) {
        Quiz q = quizzes.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Quiz", id));
        if (req.title() != null) q.setTitle(req.title().trim());
        if (req.description() != null) q.setDescription(req.description());
        if (req.moduleId() != null) {
            q.setModule(modules.findById(req.moduleId())
                    .orElseThrow(() -> new CourseNotFoundException("Module", req.moduleId())));
        }
        if (req.lessonId() != null) {
            q.setLesson(lessons.findById(req.lessonId())
                    .orElseThrow(() -> new CourseNotFoundException("Lesson", req.lessonId())));
        }
        if (req.passScore() != null) q.setPassScore(req.passScore());
        if (req.timeLimitMins() != null) q.setTimeLimitMins(req.timeLimitMins());
        if (req.maxAttempts() != null) q.setMaxAttempts(req.maxAttempts());
        if (req.shuffleQuestions() != null) q.setShuffleQuestions(req.shuffleQuestions());
        if (req.status() != null) q.setStatus(req.status());
        return q;
    }

    public void delete(UUID id) {
        if (!quizzes.existsById(id)) throw new CourseNotFoundException("Quiz", id);
        quizzes.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Quiz get(UUID id) {
        return quizzes.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Quiz", id));
    }

    @Transactional(readOnly = true)
    public List<Quiz> listForCourse(UUID courseId) {
        return quizzes.findByCourseIdOrderByPositionAsc(courseId);
    }

    public Question addQuestion(UUID quizId, QuizRequests.CreateQuestion req) {
        Quiz quiz = get(quizId);
        Question q = new Question();
        applyQuestionFields(q, req.type(), req.prompt(), req.options(), req.correct(),
                req.points(), req.explanation());
        quiz.addQuestion(q);
        quizzes.flush();
        return q;
    }

    public Question updateQuestion(UUID id, QuizRequests.UpdateQuestion req) {
        Question q = questions.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Question", id));
        applyQuestionFields(q,
                req.type() != null ? req.type() : q.getType(),
                req.prompt() != null ? req.prompt() : q.getPrompt(),
                req.options() != null ? req.options() : q.getOptions(),
                req.correct() != null ? req.correct() : q.getCorrect(),
                req.points() != null ? req.points() : q.getPoints(),
                req.explanation() != null ? req.explanation() : q.getExplanation());
        return q;
    }

    public void deleteQuestion(UUID id) {
        if (!questions.existsById(id)) throw new CourseNotFoundException("Question", id);
        questions.deleteById(id);
    }

    private void applyQuestionFields(Question q, QuestionType type, String prompt,
                                     List<String> options, List<Object> correct,
                                     Integer points, String explanation) {
        validateQuestion(type, options, correct);
        q.setType(type);
        q.setPrompt(prompt);
        q.setOptions(type == QuestionType.SHORT_ANSWER || type == QuestionType.TRUE_FALSE
                ? null
                : options);
        q.setCorrect(correct);
        q.setPoints(points != null && points > 0 ? points : 1);
        q.setExplanation(explanation);
    }

    private void validateQuestion(QuestionType type, List<String> options, List<Object> correct) {
        if (correct == null || correct.isEmpty()) {
            throw new IllegalArgumentException("correct answer is required");
        }
        switch (type) {
            case MCQ_SINGLE -> {
                requireOptions(options, 2);
                if (correct.size() != 1 || !(correct.get(0) instanceof Number)) {
                    throw new IllegalArgumentException("MCQ_SINGLE requires exactly one integer index");
                }
                int idx = ((Number) correct.get(0)).intValue();
                if (idx < 0 || idx >= options.size()) {
                    throw new IllegalArgumentException("answer index out of range");
                }
            }
            case MCQ_MULTI -> {
                requireOptions(options, 2);
                Set<Integer> seen = new HashSet<>();
                for (Object o : correct) {
                    if (!(o instanceof Number n)) {
                        throw new IllegalArgumentException("MCQ_MULTI answers must be integer indices");
                    }
                    int idx = n.intValue();
                    if (idx < 0 || idx >= options.size()) {
                        throw new IllegalArgumentException("answer index out of range");
                    }
                    seen.add(idx);
                }
                if (seen.isEmpty()) {
                    throw new IllegalArgumentException("MCQ_MULTI needs at least one correct option");
                }
            }
            case TRUE_FALSE -> {
                if (correct.size() != 1 || !(correct.get(0) instanceof Boolean)) {
                    throw new IllegalArgumentException("TRUE_FALSE requires one boolean answer");
                }
            }
            case SHORT_ANSWER -> {
                for (Object o : correct) {
                    if (!(o instanceof String s) || s.isBlank()) {
                        throw new IllegalArgumentException("SHORT_ANSWER answers must be non-empty strings");
                    }
                }
            }
        }
    }

    private void requireOptions(List<String> options, int min) {
        if (options == null || options.size() < min) {
            throw new IllegalArgumentException("at least " + min + " options required");
        }
    }

    // ---- Taking quizzes ----

    public Attempt start(UUID quizId, UUID userId, String userEmail, String userName) {
        Quiz quiz = get(quizId);
        if (quiz.getMaxAttempts() != null) {
            long taken = attempts.countByUserIdAndQuizId(userId, quizId);
            if (taken >= quiz.getMaxAttempts()) {
                throw new IllegalArgumentException(
                        "Attempt limit reached for this quiz (" + quiz.getMaxAttempts() + ")");
            }
        }
        Attempt a = new Attempt();
        a.setQuizId(quizId);
        a.setUserId(userId);
        a.setUserEmail(userEmail);
        a.setUserName(userName);
        return attempts.save(a);
    }

    public Attempt submit(UUID attemptId, UUID userId, QuizRequests.SubmitAttempt req) {
        Attempt attempt = attempts.findById(attemptId)
                .orElseThrow(() -> new CourseNotFoundException("Attempt", attemptId));
        if (!attempt.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Cannot submit another user's attempt");
        }
        if (attempt.getSubmittedAt() != null) {
            throw new IllegalArgumentException("Attempt already submitted");
        }
        Quiz quiz = get(attempt.getQuizId());

        int totalPoints = 0;
        int awarded = 0;
        attempt.getAnswers().clear();
        for (Question q : quiz.getQuestions()) {
            totalPoints += q.getPoints();
            List<Object> response = req.answers().getOrDefault(q.getId(), List.of());
            boolean correct = grade(q, response);
            AttemptAnswer aa = new AttemptAnswer();
            aa.setQuestionId(q.getId());
            aa.setResponse(response == null ? List.of() : response);
            aa.setCorrect(correct);
            aa.setPointsAwarded(correct ? q.getPoints() : 0);
            attempt.addAnswer(aa);
            if (correct) awarded += q.getPoints();
        }
        attempt.setScore(awarded);
        attempt.setMaxScore(totalPoints);
        int pct = totalPoints == 0 ? 0 : (int) Math.round((awarded * 100.0) / totalPoints);
        attempt.setScorePct(pct);
        attempt.setPassed(pct >= quiz.getPassScore());
        attempt.setSubmittedAt(OffsetDateTime.now());
        // Roll into enrollment progress so passing a PUBLISHED quiz counts
        // toward the course completion percentage. Safe no-op if the user is
        // not enrolled or the quiz is still DRAFT.
        attempts.flush();
        enrollments.recomputeEnrollmentProgress(userId, quiz.getCourse().getId());
        return attempt;
    }

    @Transactional(readOnly = true)
    public Attempt getAttempt(UUID id, UUID userId, boolean isPrivileged) {
        Attempt a = attempts.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Attempt", id));
        if (!isPrivileged && !a.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Cannot view another user's attempt");
        }
        return a;
    }

    @Transactional(readOnly = true)
    public List<Attempt> listAttempts(UUID quizId, UUID userId, boolean isPrivileged) {
        if (isPrivileged) {
            return attempts.findByQuizIdOrderByStartedAtDesc(quizId);
        }
        return attempts.findByUserIdAndQuizIdOrderByStartedAtDesc(userId, quizId);
    }

    private boolean grade(Question q, List<Object> response) {
        if (response == null || response.isEmpty()) return false;
        return switch (q.getType()) {
            case MCQ_SINGLE -> singleNumber(response).equals(singleNumber(q.getCorrect()));
            case MCQ_MULTI -> indexSet(response).equals(indexSet(q.getCorrect()));
            case TRUE_FALSE -> response.get(0) instanceof Boolean b
                    && q.getCorrect().get(0) instanceof Boolean cb
                    && b.booleanValue() == cb.booleanValue();
            case SHORT_ANSWER -> {
                if (!(response.get(0) instanceof String r) || r.isBlank()) yield false;
                String normalized = r.trim().toLowerCase();
                yield q.getCorrect().stream()
                        .filter(o -> o instanceof String)
                        .map(o -> ((String) o).trim().toLowerCase())
                        .anyMatch(s -> s.equals(normalized));
            }
        };
    }

    private Integer singleNumber(List<Object> list) {
        if (list == null || list.isEmpty()) return -1;
        Object o = list.get(0);
        return o instanceof Number n ? n.intValue() : -1;
    }

    private Set<Integer> indexSet(List<Object> list) {
        Set<Integer> out = new HashSet<>();
        if (list == null) return out;
        for (Object o : list) {
            if (o instanceof Number n) out.add(n.intValue());
        }
        return out;
    }

    // Expose internal repositories for AI helper
    QuestionRepository questionsRepo() { return questions; }
    QuizRepository quizzesRepo() { return quizzes; }
    LessonRepository lessonsRepo() { return lessons; }
    CourseModuleRepository modulesRepo() { return modules; }
    CourseRepository coursesRepo() { return courses; }

    /** Used by QuizGenerationService to attach generated questions in one transaction. */
    public Quiz attachGeneratedQuestions(Quiz quiz, List<Question> generated) {
        for (Question q : generated) {
            validateQuestion(q.getType(), q.getOptions(), q.getCorrect());
            quiz.addQuestion(q);
        }
        return quiz;
    }

    /** Build a transient question (not persisted) from raw fields. */
    public Question buildQuestion(QuestionType type, String prompt, List<String> options,
                                  List<Object> correct, Integer points, String explanation) {
        Question q = new Question();
        applyQuestionFields(q, type, prompt, options, correct, points, explanation);
        return q;
    }

    /** Internal helper used by AI generation. */
    public ArrayList<Question> emptyQuestionList() {
        return new ArrayList<>();
    }

    // ---- Per-question analytics for HR/instructor review ----

    @Transactional(readOnly = true)
    public java.util.List<QuestionAnalytics> analytics(UUID quizId) {
        Quiz quiz = get(quizId);
        java.util.List<Attempt> submitted = attempts.findByQuizIdOrderByStartedAtDesc(quizId).stream()
                .filter(a -> a.getSubmittedAt() != null)
                .toList();

        java.util.Map<UUID, java.util.List<AttemptAnswer>> answersByQuestion = new java.util.HashMap<>();
        for (Attempt a : submitted) {
            for (AttemptAnswer ans : a.getAnswers()) {
                answersByQuestion.computeIfAbsent(ans.getQuestionId(), k -> new java.util.ArrayList<>()).add(ans);
            }
        }

        java.util.List<QuestionAnalytics> out = new java.util.ArrayList<>();
        for (Question q : quiz.getQuestions()) {
            java.util.List<AttemptAnswer> answers = answersByQuestion.getOrDefault(q.getId(), java.util.List.of());
            int total = answers.size();
            int correct = (int) answers.stream().filter(AttemptAnswer::isCorrect).count();
            double pct = total == 0 ? 0.0 : Math.round((correct * 1000.0) / total) / 10.0;

            java.util.List<Integer> pickCounts = null;
            if ((q.getType() == QuestionType.MCQ_SINGLE || q.getType() == QuestionType.MCQ_MULTI)
                    && q.getOptions() != null) {
                int[] counts = new int[q.getOptions().size()];
                for (AttemptAnswer ans : answers) {
                    if (ans.getResponse() == null) continue;
                    for (Object pick : ans.getResponse()) {
                        if (pick instanceof Number n) {
                            int idx = n.intValue();
                            if (idx >= 0 && idx < counts.length) counts[idx]++;
                        }
                    }
                }
                pickCounts = new java.util.ArrayList<>(counts.length);
                for (int c : counts) pickCounts.add(c);
            }

            out.add(new QuestionAnalytics(
                    q.getId(), q.getType(), q.getPrompt(), q.getPosition(),
                    total, correct, pct, pickCounts));
        }
        return out;
    }
}
