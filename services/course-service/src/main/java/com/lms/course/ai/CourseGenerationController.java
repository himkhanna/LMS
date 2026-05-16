package com.lms.course.ai;

import com.lms.course.web.dto.CourseDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseGenerationController {

    private final CourseGenerationService generator;

    public CourseGenerationController(CourseGenerationService generator) {
        this.generator = generator;
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
