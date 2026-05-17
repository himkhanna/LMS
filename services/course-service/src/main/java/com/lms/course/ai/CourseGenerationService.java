package com.lms.course.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.course.domain.Course;
import com.lms.course.domain.CourseModule;
import com.lms.course.domain.Lesson;
import com.lms.course.repository.CourseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class CourseGenerationService {

    private static final Logger log = LoggerFactory.getLogger(CourseGenerationService.class);

    private static final Pattern FENCED_JSON = Pattern.compile(
            "```(?:json)?\\s*([\\s\\S]*?)```", Pattern.MULTILINE);

    private static final String SYSTEM_PROMPT = """
            You design online courses for a learning management system.
            Respond with valid JSON only — no prose, no markdown fences.
            Schema:
            {
              "title": string,
              "description": string,
              "modules": [
                {
                  "title": string,
                  "lessons": [
                    { "title": string, "content": string, "durationSecs": integer }
                  ]
                }
              ]
            }
            Keep lesson content to 2-4 short paragraphs. Total tokens must fit the response.
            """;

    private final AiGatewayClient gateway;
    private final CourseRepository courses;
    private final ObjectMapper json;

    public CourseGenerationService(AiGatewayClient gateway, CourseRepository courses, ObjectMapper json) {
        this.gateway = gateway;
        this.courses = courses;
        this.json = json;
    }

    public Course generate(GenerateRequest request, String bearerToken) {
        int moduleCount = request.moduleCount() != null ? request.moduleCount() : 3;
        int lessonsPerModule = request.lessonsPerModule() != null ? request.lessonsPerModule() : 3;

        StringBuilder prompt = new StringBuilder()
                .append("Design a course on: ").append(request.topic()).append('\n')
                .append("Modules: ").append(moduleCount).append('\n')
                .append("Lessons per module: ").append(lessonsPerModule).append('\n')
                .append("Audience: ")
                .append(request.audience() != null ? request.audience() : "general learners")
                .append('\n');
        if (request.sourceMaterial() != null && !request.sourceMaterial().isBlank()) {
            prompt.append('\n')
                    .append("Use the following source material (extracted from a slide deck) as the")
                    .append(" primary basis for the course. Design a clean pedagogical structure;")
                    .append(" do not blindly mirror the slide order.\n")
                    .append("--- SOURCE MATERIAL ---\n")
                    .append(request.sourceMaterial())
                    .append("\n--- END SOURCE MATERIAL ---\n");
        }
        String userPrompt = prompt.toString();

        var aiReq = new AiGatewayClient.CompletionRequest(
                request.providerId(),
                request.model(),
                List.of(AiGatewayClient.Message.system(SYSTEM_PROMPT),
                        AiGatewayClient.Message.user(userPrompt)),
                0.4,
                request.maxTokens() != null ? request.maxTokens() : 2000,
                "course-generation"
        );

        AiGatewayClient.CompletionResponse aiResp = gateway.complete(aiReq, bearerToken);
        log.info("ai course gen: model={} tokens={}", aiResp.model(), aiResp.totalTokens());

        GeneratedCourse parsed = parse(aiResp.content());
        return persist(parsed);
    }

    private GeneratedCourse parse(String content) {
        String body = content == null ? "" : content.trim();
        Matcher m = FENCED_JSON.matcher(body);
        if (m.find()) body = m.group(1).trim();
        int first = body.indexOf('{');
        int last = body.lastIndexOf('}');
        if (first < 0 || last <= first) {
            throw new AiGatewayException("AI response did not contain JSON: " + content);
        }
        String jsonOnly = body.substring(first, last + 1);
        try {
            return json.readValue(jsonOnly, GeneratedCourse.class);
        } catch (Exception e) {
            throw new AiGatewayException("Could not parse AI JSON: " + e.getMessage(), e);
        }
    }

    private Course persist(GeneratedCourse data) {
        Course c = new Course();
        c.setTitle(safe(data.title(), "Untitled course"));
        c.setDescription(data.description());
        if (data.modules() != null) {
            for (GeneratedModule gm : data.modules()) {
                CourseModule m = new CourseModule();
                m.setTitle(safe(gm.title(), "Module"));
                c.addModule(m);
                if (gm.lessons() != null) {
                    for (GeneratedLesson gl : gm.lessons()) {
                        Lesson l = new Lesson();
                        l.setTitle(safe(gl.title(), "Lesson"));
                        l.setContent(gl.content());
                        l.setDurationSecs(gl.durationSecs());
                        m.addLesson(l);
                    }
                }
            }
        }
        return courses.save(c);
    }

    private static String safe(String s, String fallback) {
        return s == null || s.isBlank() ? fallback : s;
    }

    public record GenerateRequest(
            String topic,
            String audience,
            Integer moduleCount,
            Integer lessonsPerModule,
            UUID providerId,
            String model,
            Integer maxTokens,
            String sourceMaterial
    ) {
        public GenerateRequest(String topic, String audience, Integer moduleCount,
                               Integer lessonsPerModule, UUID providerId, String model,
                               Integer maxTokens) {
            this(topic, audience, moduleCount, lessonsPerModule, providerId, model, maxTokens, null);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeneratedCourse(String title, String description, List<GeneratedModule> modules) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeneratedModule(String title, List<GeneratedLesson> lessons) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeneratedLesson(String title, String content, Integer durationSecs) {}
}
