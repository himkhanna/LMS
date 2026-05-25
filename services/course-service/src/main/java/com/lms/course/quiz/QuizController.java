package com.lms.course.quiz;

import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Class-level @Transactional keeps the Hibernate session open while
 * DTO mappers (QuizDto.summary, AttemptDto.from, ...) touch lazy
 * associations like Quiz.course or Attempt.quiz. Without this, listing
 * endpoints throw LazyInitializationException once any row exists,
 * because spring.jpa.open-in-view is false in this service.
 */
@RestController
@RequestMapping("/api/v1")
@Transactional
public class QuizController {

    private final QuizService service;
    private final QuizGenerationService generation;
    private final QuizDocxImporter docxImporter;

    public QuizController(QuizService service,
                          QuizGenerationService generation,
                          QuizDocxImporter docxImporter) {
        this.service = service;
        this.generation = generation;
        this.docxImporter = docxImporter;
    }

    public record DocxImportResponse(QuizDto quiz, int questionCount, List<String> warnings) {}

    /**
     * Bulk-import a quiz from a Word (.docx) document following the
     * "Question N | Topic: ... | (Select all that apply)?" template
     * (see Data_Security_Quiz_1.docx for the canonical example).
     * Creates the quiz as DRAFT — HR reviews + publishes.
     */
    @PostMapping(value = "/courses/{courseId}/quizzes/import-docx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public DocxImportResponse importDocx(
            @PathVariable UUID courseId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Missing file");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".docx")) {
            throw new IllegalArgumentException("Only .docx is supported");
        }
        var result = docxImporter.importDocx(courseId, title, file);
        return new DocxImportResponse(
                QuizDto.from(result.quiz(), true),
                result.questionCount(),
                result.warnings());
    }

    // ---- Authoring (admin / HR / instructor) ----

    @GetMapping("/courses/{courseId}/quizzes")
    public List<QuizDto> listForCourse(@PathVariable UUID courseId) {
        return service.listForCourse(courseId).stream().map(QuizDto::summary).toList();
    }

    @PostMapping("/courses/{courseId}/quizzes")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<QuizDto> create(@PathVariable UUID courseId,
                                          @Valid @RequestBody QuizRequests.CreateQuiz req) {
        Quiz q = service.create(courseId, req);
        return ResponseEntity.status(201).body(QuizDto.summary(q));
    }

    @GetMapping("/quizzes/{id}")
    public QuizDto get(@PathVariable UUID id, Authentication auth) {
        Quiz q = service.get(id);
        boolean privileged = hasAnyRole(auth, "ROLE_ADMIN", "ROLE_HR", "ROLE_INSTRUCTOR");
        return QuizDto.withQuestions(q, privileged);
    }

    @PatchMapping("/quizzes/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public QuizDto update(@PathVariable UUID id, @RequestBody QuizRequests.UpdateQuiz req) {
        return QuizDto.summary(service.update(id, req));
    }

    @DeleteMapping("/quizzes/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/quizzes/{quizId}/questions")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<QuestionDto> addQuestion(@PathVariable UUID quizId,
                                                   @Valid @RequestBody QuizRequests.CreateQuestion req) {
        Question q = service.addQuestion(quizId, req);
        return ResponseEntity.status(201).body(QuestionDto.from(q, true));
    }

    @PatchMapping("/questions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public QuestionDto updateQuestion(@PathVariable UUID id,
                                      @RequestBody QuizRequests.UpdateQuestion req) {
        return QuestionDto.from(service.updateQuestion(id, req), true);
    }

    @DeleteMapping("/questions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public ResponseEntity<Void> deleteQuestion(@PathVariable UUID id) {
        service.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/quizzes/{id}/generate")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public QuizDto generate(@PathVariable UUID id,
                            @RequestBody QuizRequests.GenerateQuiz req,
                            @AuthenticationPrincipal Jwt jwt) {
        Quiz q = generation.generate(id, req, jwt.getTokenValue());
        return QuizDto.withQuestions(q, true);
    }

    @GetMapping("/quizzes/{id}/attempts")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public List<AttemptDto> listAttempts(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.listAttempts(id, currentUserId(jwt), true).stream()
                .map(AttemptDto::from)
                .toList();
    }

    @GetMapping("/quizzes/{id}/analytics")
    @PreAuthorize("hasAnyRole('ADMIN','HR','INSTRUCTOR')")
    public List<QuestionAnalytics> analytics(@PathVariable UUID id) {
        return service.analytics(id);
    }

    // ---- Learner taking the quiz ----

    @PostMapping("/quizzes/{id}/attempts")
    public AttemptDto startAttempt(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        Attempt a = service.start(id,
                currentUserId(jwt),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name"));
        return AttemptDto.from(a);
    }

    @PostMapping("/attempts/{id}/submit")
    public AttemptDto submit(@PathVariable UUID id,
                             @Valid @RequestBody QuizRequests.SubmitAttempt req,
                             @AuthenticationPrincipal Jwt jwt) {
        Attempt a = service.submit(id, currentUserId(jwt), req);
        return AttemptDto.from(a, true);
    }

    @GetMapping("/attempts/{id}")
    public AttemptDto getAttempt(@PathVariable UUID id,
                                 @AuthenticationPrincipal Jwt jwt,
                                 Authentication auth) {
        boolean privileged = hasAnyRole(auth, "ROLE_ADMIN", "ROLE_HR", "ROLE_INSTRUCTOR");
        Attempt a = service.getAttempt(id, currentUserId(jwt), privileged);
        return AttemptDto.from(a, true);
    }

    @GetMapping("/me/quizzes/{id}/attempts")
    public List<AttemptDto> myAttempts(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.listAttempts(id, currentUserId(jwt), false).stream()
                .map(AttemptDto::from)
                .toList();
    }

    // ---- helpers ----

    private static UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new IllegalStateException("Missing authenticated user");
        }
        return UUID.fromString(jwt.getSubject());
    }

    private static boolean hasAnyRole(Authentication auth, String... roles) {
        if (auth == null) return false;
        for (String r : roles) {
            for (var a : auth.getAuthorities()) {
                if (r.equals(a.getAuthority())) return true;
            }
        }
        return false;
    }
}
