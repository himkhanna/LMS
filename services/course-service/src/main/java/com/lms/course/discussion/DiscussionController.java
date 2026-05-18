package com.lms.course.discussion;

import com.lms.course.repository.CourseRepository;
import com.lms.course.service.CourseNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Course-level discussion threads. Single-level threading: a post is
 * either a top-level question/comment (parent_id = null) or a reply.
 * Any signed-in user can post and reply. Authors and admin/HR/instructor
 * can delete (soft). Admin/HR/instructor can pin top-level posts.
 */
@RestController
@RequestMapping("/api/v1")
@Transactional
public class DiscussionController {

    private final DiscussionPostRepository posts;
    private final CourseRepository courses;

    public DiscussionController(DiscussionPostRepository posts, CourseRepository courses) {
        this.posts = posts;
        this.courses = courses;
    }

    @GetMapping("/courses/{courseId}/discussion")
    @Transactional(readOnly = true)
    public List<DiscussionDto> list(@PathVariable UUID courseId) {
        if (!courses.existsById(courseId)) throw new CourseNotFoundException("Course", courseId);
        List<DiscussionPost> tops = posts.findTopLevel(courseId);
        if (tops.isEmpty()) return List.of();
        List<UUID> topIds = tops.stream().map(DiscussionPost::getId).toList();
        List<DiscussionPost> replies = posts.findRepliesForParents(topIds);
        Map<UUID, List<DiscussionDto>> repliesByParent = new HashMap<>();
        for (DiscussionPost r : replies) {
            repliesByParent
                    .computeIfAbsent(r.getParentId(), k -> new ArrayList<>())
                    .add(DiscussionDto.from(r, List.of()));
        }
        List<DiscussionDto> out = new ArrayList<>(tops.size());
        for (DiscussionPost t : tops) {
            out.add(DiscussionDto.from(t, repliesByParent.getOrDefault(t.getId(), List.of())));
        }
        return out;
    }

    public record CreatePost(@NotBlank String body) {}

    @PostMapping("/courses/{courseId}/discussion")
    public DiscussionDto createTopLevel(@PathVariable UUID courseId,
                                        @Valid @RequestBody CreatePost req,
                                        @AuthenticationPrincipal Jwt jwt) {
        if (!courses.existsById(courseId)) throw new CourseNotFoundException("Course", courseId);
        DiscussionPost p = new DiscussionPost();
        p.setCourseId(courseId);
        p.setParentId(null);
        p.setAuthorUserId(currentUserId(jwt));
        p.setAuthorEmail(jwt.getClaimAsString("email"));
        p.setAuthorName(jwt.getClaimAsString("name"));
        p.setBody(req.body().trim());
        posts.save(p);
        return DiscussionDto.from(p, List.of());
    }

    @PostMapping("/discussion/{parentId}/replies")
    public DiscussionDto reply(@PathVariable UUID parentId,
                               @Valid @RequestBody CreatePost req,
                               @AuthenticationPrincipal Jwt jwt) {
        DiscussionPost parent = posts.findById(parentId)
                .orElseThrow(() -> new CourseNotFoundException("Post", parentId));
        if (parent.getParentId() != null) {
            throw new IllegalArgumentException("Cannot reply to a reply (single-level threading)");
        }
        DiscussionPost r = new DiscussionPost();
        r.setCourseId(parent.getCourseId());
        r.setParentId(parent.getId());
        r.setAuthorUserId(currentUserId(jwt));
        r.setAuthorEmail(jwt.getClaimAsString("email"));
        r.setAuthorName(jwt.getClaimAsString("name"));
        r.setBody(req.body().trim());
        posts.save(r);
        return DiscussionDto.from(r, List.of());
    }

    @PostMapping("/discussion/{id}/pin")
    public DiscussionDto setPinned(@PathVariable UUID id,
                                   @RequestParam(defaultValue = "true") boolean pinned,
                                   Authentication auth) {
        requirePrivileged(auth);
        DiscussionPost p = posts.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Post", id));
        if (p.getParentId() != null) {
            throw new IllegalArgumentException("Only top-level posts can be pinned");
        }
        p.setPinned(pinned);
        return DiscussionDto.from(p, List.of());
    }

    @DeleteMapping("/discussion/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable UUID id,
                                           @AuthenticationPrincipal Jwt jwt,
                                           Authentication auth) {
        DiscussionPost p = posts.findById(id)
                .orElseThrow(() -> new CourseNotFoundException("Post", id));
        boolean isAuthor = currentUserId(jwt).equals(p.getAuthorUserId());
        boolean isPrivileged = hasAnyRole(auth, "ROLE_ADMIN", "ROLE_HR", "ROLE_INSTRUCTOR");
        if (!isAuthor && !isPrivileged) {
            throw new IllegalArgumentException("Cannot delete another user's post");
        }
        p.setDeletedAt(OffsetDateTime.now());
        return ResponseEntity.noContent().build();
    }

    private static void requirePrivileged(Authentication auth) {
        if (!hasAnyRole(auth, "ROLE_ADMIN", "ROLE_HR", "ROLE_INSTRUCTOR")) {
            throw new IllegalArgumentException("Requires ADMIN, HR or INSTRUCTOR role");
        }
    }

    private static boolean hasAnyRole(Authentication auth, String... roles) {
        if (auth == null) return false;
        for (var a : auth.getAuthorities()) {
            String name = a.getAuthority();
            for (String r : roles) if (r.equals(name)) return true;
        }
        return false;
    }

    private static UUID currentUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new IllegalStateException("Missing authenticated user");
        }
        return UUID.fromString(jwt.getSubject());
    }
}
