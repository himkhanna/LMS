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

    public CourseGenerationController(CourseGenerationService generator,
                                      MechanicalDeckCourseService mechanical) {
        this.generator = generator;
        this.mechanical = mechanical;
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
