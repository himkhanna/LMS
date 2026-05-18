package com.lms.course.ai;

import com.lms.course.web.dto.CourseDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseGenerationController {

    private final CourseGenerationService generator;
    private final MechanicalDeckCourseService mechanical;
    private final SlideshowCourseService slideshow;

    public CourseGenerationController(CourseGenerationService generator,
                                      MechanicalDeckCourseService mechanical,
                                      SlideshowCourseService slideshow) {
        this.generator = generator;
        this.mechanical = mechanical;
        this.slideshow = slideshow;
    }

    @PostMapping("/generate")
    public ResponseEntity<CourseDto> generate(@Valid @RequestBody GenerateApiRequest req,
                                              @AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            throw new IllegalStateException("Missing JWT");
        }
        var serviceReq = new CourseGenerationService.GenerateRequest(
                req.topic(), req.audience(),
                req.moduleCount(), req.lessonsPerModule(),
                req.providerId(), req.model(), req.maxTokens());
        var course = generator.generate(serviceReq, jwt.getTokenValue());
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + course.getId()))
                .body(CourseDto.from(course));
    }

    @PostMapping(value = "/generate-from-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CourseDto> generateFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", required = false, defaultValue = "ai") String mode,
            @RequestParam(value = "topic", required = false) String topic,
            @RequestParam(value = "audience", required = false) String audience,
            @RequestParam(value = "moduleCount", required = false) Integer moduleCount,
            @RequestParam(value = "lessonsPerModule", required = false) Integer lessonsPerModule,
            @RequestParam(value = "providerId", required = false) UUID providerId,
            @RequestParam(value = "model", required = false) String model,
            @RequestParam(value = "maxTokens", required = false) Integer maxTokens,
            @AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            throw new IllegalStateException("Missing JWT");
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".pptx") && !name.endsWith(".ppt")) {
            throw new IllegalArgumentException("Only .pptx and .ppt are supported");
        }
        List<SlideDeckExtractor.ExtractedSlide> slides;
        try (var in = file.getInputStream()) {
            slides = SlideDeckExtractor.extract(in);
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read uploaded file: " + e.getMessage(), e);
        }
        if (slides == null || slides.isEmpty()) {
            throw new IllegalArgumentException("No slides could be extracted from the deck");
        }
        String effectiveTopic = (topic == null || topic.isBlank())
                ? stripExtension(name)
                : topic;

        if ("mechanical".equalsIgnoreCase(mode)) {
            var course = mechanical.build(effectiveTopic, slides, lessonsPerModule);
            return ResponseEntity
                    .created(URI.create("/api/v1/courses/" + course.getId()))
                    .body(CourseDto.from(course));
        }

        String extracted = SlideDeckExtractor.toPromptText(slides);
        if (extracted.isBlank()) {
            throw new IllegalArgumentException("No text could be extracted from the deck");
        }
        var serviceReq = new CourseGenerationService.GenerateRequest(
                effectiveTopic, audience, moduleCount, lessonsPerModule,
                providerId, model, maxTokens, extracted);
        var course = generator.generate(serviceReq, jwt.getTokenValue());
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + course.getId()))
                .body(CourseDto.from(course));
    }

    /**
     * Render every slide of a .pptx to a PNG and create a course where
     * each lesson displays the rendered slide image (not just extracted
     * text). Speaker notes, if present, are tucked under a collapsible
     * "Speaker notes" panel. Only .pptx is supported here — legacy
     * .ppt (HSLF) uses a different render pipeline.
     */
    @PostMapping(value = "/render-from-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CourseDto> renderFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "topic", required = false) String topic,
            @RequestParam(value = "slidesPerModule", required = false) Integer slidesPerModule) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".pptx")) {
            throw new IllegalArgumentException(
                    "Slideshow mode supports .pptx only. Re-save the deck as .pptx and try again.");
        }
        List<SlideDeckRenderer.RenderedSlide> rendered;
        List<SlideDeckExtractor.ExtractedSlide> extracted;
        try (var renderIn = file.getInputStream()) {
            rendered = SlideDeckRenderer.renderToPng(renderIn);
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not render deck: " + e.getMessage(), e);
        }
        try (var textIn = file.getInputStream()) {
            extracted = SlideDeckExtractor.extract(textIn);
        } catch (IOException e) {
            // Non-fatal: keep going with images only
            extracted = List.of();
        }
        if (rendered.isEmpty()) {
            throw new IllegalArgumentException("Deck contains no renderable slides");
        }
        String effectiveTopic = (topic == null || topic.isBlank()) ? stripExtension(name) : topic;
        var course = slideshow.build(effectiveTopic, extracted, rendered, slidesPerModule);
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + course.getId()))
                .body(CourseDto.from(course));
    }

    /**
     * Parse a slide deck and return the proposed course / module / lesson
     * structure without persisting. Used by the PPT designer view so HR
     * can edit titles + content + structure before committing.
     */
    @PostMapping(value = "/extract-from-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MechanicalDeckCourseService.ProposedCourse extractFromFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "topic", required = false) String topic,
            @RequestParam(value = "lessonsPerModule", required = false) Integer lessonsPerModule) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Missing file");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".pptx") && !name.endsWith(".ppt")) {
            throw new IllegalArgumentException("Only .pptx and .ppt are supported");
        }
        List<SlideDeckExtractor.ExtractedSlide> slides;
        try (var in = file.getInputStream()) {
            slides = SlideDeckExtractor.extract(in);
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read uploaded file: " + e.getMessage(), e);
        }
        if (slides == null || slides.isEmpty()) {
            throw new IllegalArgumentException("No slides could be extracted from the deck");
        }
        String effectiveTopic = (topic == null || topic.isBlank()) ? stripExtension(name) : topic;
        return mechanical.propose(effectiveTopic, slides, lessonsPerModule);
    }

    /**
     * Persist a (possibly edited) proposed course structure. Called by the
     * PPT designer's "Create course" action.
     */
    @PostMapping("/from-structure")
    public ResponseEntity<CourseDto> fromStructure(
            @RequestBody MechanicalDeckCourseService.ProposedCourse req) {
        var course = mechanical.persist(req);
        return ResponseEntity
                .created(URI.create("/api/v1/courses/" + course.getId()))
                .body(CourseDto.from(course));
    }

    private static String stripExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    public record GenerateApiRequest(
            @NotBlank String topic,
            String audience,
            @Positive Integer moduleCount,
            @Positive Integer lessonsPerModule,
            UUID providerId,
            String model,
            @Positive Integer maxTokens
    ) {}
}
