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
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class CourseGenerationService {

    private static final Logger log = LoggerFactory.getLogger(CourseGenerationService.class);

    private static final Pattern FENCED_JSON = Pattern.compile(
            "```(?:json)?\\s*([\\s\\S]*?)```", Pattern.MULTILINE);

    /**
     * Ask the LLM for engaging, visually-friendly output: structured HTML
     * (h2/h3/p/ul/ol/blockquote/code/strong/em/table), a hero image hint
     * (1–3 keywords we feed to LoremFlickr), 2–4 key takeaways, and an
     * emoji icon. Smaller fields are optional so 3B-class models still
     * produce something usable when they skip a field.
     */
    private static final String SYSTEM_PROMPT = """
            You are an instructional designer building engaging online lessons.
            Respond with ONE JSON object only — no markdown fences, no prose
            outside the JSON. Schema:

            {
              "title": string,
              "description": string,
              "modules": [
                {
                  "title": string,
                  "lessons": [
                    {
                      "title": string,
                      "icon": string,                // 1 emoji that fits the lesson, e.g. "🛡️"
                      "heroImageKeywords": string,   // 1-3 lowercase, comma-separated nouns
                                                     // for stock photo lookup (e.g. "security,padlock")
                      "content": string,             // ~250-450 words of HTML. Use h2 for the lead
                                                     // heading, h3 for sub-sections, p, ul, ol,
                                                     // blockquote for an aha-moment quote, strong
                                                     // for emphasis, code for tech terms, table when
                                                     // comparing things. Concrete examples > abstract
                                                     // theory. No <script>, no inline styles.
                      "keyTakeaways": [string],      // 3-5 short bullet points (one sentence each)
                      "durationSecs": integer        // realistic read time at 200 wpm
                    }
                  ]
                }
              ]
            }

            Guidelines:
            - Vary the structure across lessons — not every lesson is bullets.
              Some should be a story, some a how-to, some a comparison table.
            - Open every lesson with a hook in <p> (a question, a stat, a
              short story) BEFORE the first <h2>.
            - Use real-world examples and concrete numbers, not generic
              platitudes.
            - heroImageKeywords must be photographable: physical objects,
              places, professions. Avoid abstract words like "trust" or
              "synergy".
            - Output ONLY the JSON object. No backticks, no commentary.
            """;

    /**
     * LoremFlickr serves themed Creative Commons photos by keyword and is
     * free / no API key. The "lock" query stabilises the image so the same
     * lesson always renders with the same photo.
     */
    private static final String HERO_IMAGE_TEMPLATE = "https://loremflickr.com/1280/720/%s?lock=%d";

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
                0.6, // bump from 0.4 — more colour, still grounded
                request.maxTokens() != null ? request.maxTokens() : 4096,
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
        c.getTags().add("ai-generated");
        if (data.modules() != null) {
            for (GeneratedModule gm : data.modules()) {
                CourseModule m = new CourseModule();
                m.setTitle(safe(gm.title(), "Module"));
                c.addModule(m);
                if (gm.lessons() != null) {
                    for (GeneratedLesson gl : gm.lessons()) {
                        Lesson l = new Lesson();
                        l.setTitle(formatLessonTitle(gl));
                        l.setContent(buildLessonHtml(gl));
                        l.setDurationSecs(gl.durationSecs() != null && gl.durationSecs() > 0
                                ? gl.durationSecs() : 120);
                        m.addLesson(l);
                    }
                }
            }
        }
        return courses.save(c);
    }

    private static String formatLessonTitle(GeneratedLesson gl) {
        String title = safe(gl.title(), "Lesson");
        if (gl.icon() != null && !gl.icon().isBlank() && !title.startsWith(gl.icon().trim())) {
            return gl.icon().trim() + "  " + title;
        }
        return title;
    }

    /**
     * Compose the final lesson HTML from the LLM pieces: hero image, the
     * main content body, and a key-takeaways callout. Each section is
     * skipped gracefully when the LLM omitted it, so smaller models still
     * produce a usable lesson.
     */
    private static String buildLessonHtml(GeneratedLesson gl) {
        StringBuilder html = new StringBuilder();

        String heroKeywords = sanitiseKeywords(gl.heroImageKeywords());
        if (!heroKeywords.isBlank()) {
            int lock = Math.abs((safe(gl.title(), heroKeywords) + heroKeywords).hashCode()) % 100_000;
            String url = String.format(HERO_IMAGE_TEMPLATE, heroKeywords, lock);
            html.append("<figure class=\"lesson-hero\">")
                    .append("<img src=\"").append(escapeAttr(url)).append("\" ")
                    .append("alt=\"").append(escapeAttr(safe(gl.title(), "Lesson image"))).append("\" ")
                    .append("loading=\"lazy\" style=\"width:100%;max-height:360px;object-fit:cover;border-radius:12px\" />")
                    .append("</figure>");
        }

        if (gl.content() != null && !gl.content().isBlank()) {
            // We trust the LLM to emit safe-ish HTML; the SPA still runs
            // DOMPurify before rendering.
            html.append("<div class=\"lesson-body\">").append(gl.content()).append("</div>");
        }

        if (gl.keyTakeaways() != null && !gl.keyTakeaways().isEmpty()) {
            html.append("<aside class=\"key-takeaways\" style=\"margin-top:1.5rem;padding:1rem 1.25rem;")
                    .append("background:#eef2ff;border-left:4px solid #4f46e5;border-radius:8px\">")
                    .append("<h3 style=\"margin-top:0\">🎯 Key takeaways</h3><ul>");
            for (String t : gl.keyTakeaways()) {
                if (t == null || t.isBlank()) continue;
                html.append("<li>").append(escapeText(t)).append("</li>");
            }
            html.append("</ul></aside>");
        }

        return html.length() == 0 ? null : html.toString();
    }

    /** Strip the LLM keyword string to lowercase comma-separated tokens
     * suitable for the LoremFlickr URL path. */
    private static String sanitiseKeywords(String raw) {
        if (raw == null) return "";
        String[] parts = raw.toLowerCase(Locale.ENGLISH).split("[,\\s]+");
        StringBuilder sb = new StringBuilder();
        int kept = 0;
        for (String p : parts) {
            String token = p.replaceAll("[^a-z0-9-]", "");
            if (token.isBlank()) continue;
            if (sb.length() > 0) sb.append(',');
            sb.append(token);
            if (++kept >= 3) break;
        }
        return sb.toString();
    }

    private static String escapeAttr(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
    }

    private static String escapeText(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
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
    record GeneratedLesson(
            String title,
            String icon,
            String heroImageKeywords,
            String content,
            List<String> keyTakeaways,
            Integer durationSecs
    ) {}
}
