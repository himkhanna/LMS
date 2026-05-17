package com.lms.auth.web;

import com.lms.auth.domain.AppUser;
import com.lms.auth.repository.AppUserRepository;
import com.lms.auth.service.AuthService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Read-only user directory used by HR + admins to pick people for course
 * assignments. Returns minimal profile data; password-related fields are
 * never exposed here.
 */
@RestController
@RequestMapping("/api/v1/directory")
public class DirectoryController {

    public record DirectoryUser(UUID id, String email, String displayName, String role,
                                String status, String department, String managerEmail) {
        static DirectoryUser from(AppUser u) {
            return new DirectoryUser(u.getId(), u.getEmail(), u.getDisplayName(),
                    u.getRole().name(), u.getStatus().name(),
                    u.getDepartment(), u.getManagerEmail());
        }
    }

    private final AppUserRepository users;

    public DirectoryController(AppUserRepository users) {
        this.users = users;
    }

    @GetMapping("/users")
    public Page<DirectoryUser> search(@RequestParam(required = false) String q,
                                      @RequestParam(required = false) String department,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "50") int size) {
        Page<AppUser> result = users.adminSearch(
                null,
                AppUser.Status.ACTIVE,
                q == null || q.isBlank() ? null : "%" + q.toLowerCase() + "%",
                PageRequest.of(page, Math.min(size, 200)));
        // department filter applied in-memory; small directory + no urgency to add a DB index yet
        if (department != null && !department.isBlank()) {
            List<DirectoryUser> filtered = result.getContent().stream()
                    .filter(u -> department.equalsIgnoreCase(u.getDepartment()))
                    .map(DirectoryUser::from)
                    .toList();
            return new org.springframework.data.domain.PageImpl<>(filtered,
                    result.getPageable(), filtered.size());
        }
        return result.map(DirectoryUser::from);
    }

    @GetMapping("/users/by-ids")
    public List<DirectoryUser> byIds(@RequestParam List<UUID> ids) {
        return users.findAllById(ids).stream().map(DirectoryUser::from).toList();
    }

    @GetMapping("/users/{id}")
    public DirectoryUser get(@PathVariable UUID id) {
        return users.findById(id)
                .map(DirectoryUser::from)
                .orElseThrow(() -> new AuthService.NotFoundException("User not found"));
    }
}
