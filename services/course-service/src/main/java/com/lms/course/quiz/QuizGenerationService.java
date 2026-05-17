package com.lms.course.quiz;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.course.ai.AiGatewayClient;
import com.lms.course.ai.AiGatewayException;
import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.Lesson;
import com.lms.course.repository.CourseModuleRepository;
import com.lms.course.repository.LessonRepository;
import com.lms.course.service.CourseNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class QuizGenerationService {

    private static final Logger log = LoggerFactory.getLogger(QuizGenerationService.class);

    private static final Pattern FENCED_JSON = Pattern.compile(
            "```(?:json)?\\s*([\\s\\S]*?)```", Pattern.MULTILINE);

    private static final String SYSTEM_PROMPT = """
            You write assessment questions for an enterprise learning platform.
            Respond with valid JSON only — no prose, no markdown fences.
            Schema:
            {
              "questions": [
                {
                  "type":   "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE" | "SHORT_ANSWER",
                  "prompt": string,
                  "options": [string, ...] | null,
                  "correct": array,
                  "points": integer,
                  "explanation": string
                }
              ]
            }
            Rules:
            - MCQ_SINGLE: 4 options; correct is [index] with one integer
            - MCQ_MULTI : 4-5 options; correct is [index, index, ...] with 2+ integers
            - TRUE_FALSE: options=null; correct=[true] or [false]
            - SHORT_ANSWER: options=null; correct is a list of 1-3 acceptable answer strings
            - Stay grounded in the source material. Do not invent facts.
            - Keep prompts clear and unambiguous.
            - Default points to 1 unless asked otherwise.
            """;

    private final AiGatewayClient gateway;
    private final QuizService quizService;
    private final QuizRepository quizzes;
    private final LessonRepository lessons;
    private final CourseModuleRepository modules;
    private final ObjectMapper json;

    public QuizGenerationService(AiGatewayClient gateway,
                                 QuizService quizService,
                                 QuizRepository quizzes,
                                 LessonRepository lessons,
                                 CourseModuleRepository modules,
                                 ObjectMapper json) {
        this.gateway = gateway;
        this.quizService = quizService;
        this.quizzes = quizzes;
        this.lessons = lessons;
        this.modules = modules;
        this.json = json;
    }

    public Quiz generate(UUID quizId, QuizRequests.GenerateQuiz req, String bearerToken) {
        Quiz quiz = quizzes.findById(quizId)
                .orElseThrow(() -> new CourseNotFoundException("Quiz", quizId));

        String source = buildSourceMaterial(quiz, req);
        if (source.isBlank()) {
            throw new IllegalArgumentException(
                    "No source material to generate questions from. Pick a lesson or module first.");
        }

        int count = req.questionCount() != null && req.questionCount() > 0 ? req.questionCount() : 5;
        List<QuestionType> types = req.types() != null && !req.types().isEmpty()
                ? req.types()
                : Arrays.asList(QuestionType.MCQ_SINGLE, QuestionType.TRUE_FALSE);
        String typeList = types.stream().map(Enum::name).reduce((a, b) -> a + ", " + b).orElse("MCQ_SINGLE");
        String difficulty = req.difficulty() != null ? req.difficulty() : "medium";

        String userPrompt = """
                Generate %d assessment questions at %s difficulty.
                Allowed question types (mix them as appropriate): %s.
                Use only the following source material as the basis:
                --- SOURCE ---
                %s
                --- END SOURCE ---
                """.formatted(count, difficulty, typeList, source);

        var aiReq = new AiGatewayClient.CompletionRequest(
                req.providerId(),
                req.model(),
                List.of(
                        AiGatewayClient.Message.system(SYSTEM_PROMPT),
                        AiGatewayClient.Message.user(userPrompt)),
                0.3,
                req.maxTokens() != null ? req.maxTokens() : 1800,
                "quiz-generation"
        );
        AiGatewayClient.CompletionResponse resp = gateway.complete(aiReq, bearerToken);
        log.info("ai quiz gen: model={} tokens={}", resp.model(), resp.totalTokens());

        GeneratedQuestions parsed = parse(resp.content());
        List<Question> built = new ArrayList<>();
        if (parsed.questions() != null) {
            for (GeneratedQuestion gq : parsed.questions()) {
                if (gq == null || gq.type == null || gq.prompt == null) continue;
                try {
                    Question q = quizService.buildQuestion(
                            gq.type,
                            gq.prompt,
                            gq.options,
                            gq.correct == null ? List.of() : gq.correct,
                            gq.points,
                            gq.explanation);
                    built.add(q);
                } catch (IllegalArgumentException ex) {
                    log.warn("skipping invalid generated question: {}", ex.getMessage());
                }
            }
        }
        if (built.isEmpty()) {
            throw new AiGatewayException("AI returned no usable questions");
        }
        quizService.attachGeneratedQuestions(quiz, built);
        return quiz;
    }

    private String buildSourceMaterial(Quiz quiz, QuizRequests.GenerateQuiz req) {
        StringBuilder sb = new StringBuilder();
        if (req.lessonId() != null) {
            Lesson l = lessons.findById(req.lessonId())
                    .orElseThrow(() -> new CourseNotFoundException("Lesson", req.lessonId()));
            appendLesson(sb, l);
        } else if (req.moduleId() != null) {
            CourseModule m = modules.findById(req.moduleId())
                    .orElseThrow(() -> new CourseNotFoundException("Module", req.moduleId()));
            sb.append("# Module: ").append(m.getTitle()).append("\n\n");
            for (Lesson l : m.getLessons()) {
                appendLesson(sb, l);
            }
        } else {
            Course c = quiz.getCourse();
            sb.append("# Course: ").append(c.getTitle()).append("\n");
            if (c.getDescription() != null) sb.append(c.getDescription()).append("\n\n");
            for (CourseModule m : c.getModules()) {
                sb.append("## Module: ").append(m.getTitle()).append("\n");
                for (Lesson l : m.getLessons()) appendLesson(sb, l);
            }
        }
        return sb.toString();
    }

    private void appendLesson(StringBuilder sb, Lesson l) {
        sb.append("## Lesson: ").append(l.getTitle()).append("\n");
        if (l.getContent() != null) {
            sb.append(stripHtml(l.getContent())).append("\n\n");
        }
    }

    private String stripHtml(String s) {
        return s == null ? "" : s.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private GeneratedQuestions parse(String content) {
        String body = content == null ? "" : content.trim();
        Matcher m = FENCED_JSON.matcher(body);
        if (m.find()) body = m.group(1).trim();
        int first = body.indexOf('{');
        int last = body.lastIndexOf('}');
        if (first < 0 || last <= first) {
            throw new AiGatewayException("AI response did not contain JSON: " + content);
        }
        try {
            return json.readValue(body.substring(first, last + 1), GeneratedQuestions.class);
        } catch (Exception e) {
            throw new AiGatewayException("Could not parse AI JSON: " + e.getMessage(), e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeneratedQuestions(List<GeneratedQuestion> questions) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeneratedQuestion(
            QuestionType type,
            String prompt,
            List<String> options,
            List<Object> correct,
            Integer points,
            String explanation
    ) {}
}
