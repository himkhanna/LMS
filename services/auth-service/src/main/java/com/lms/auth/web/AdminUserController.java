package com.lms.auth.web;

import com.lms.auth.domain.AppUser;
import com.lms.auth.service.AuthService;
import com.lms.auth.web.dto.CreateAdminRequest;
import com.lms.auth.web.dto.ResetPasswordRequest;
import com.lms.auth.web.dto.UpdateUserRequest;
import com.lms.auth.web.dto.UserDto;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final AuthService service;

    public AdminUserController(AuthService service) { this.service = service; }

    @GetMapping
    public Page<UserDto> list(@RequestParam(required = false) AppUser.Role role,
                              @RequestParam(required = false) AppUser.Status status,
                              @RequestParam(required = false) String q,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "50") int size) {
        return service.adminList(role, status, q, PageRequest.of(page, Math.min(size, 200)))
                .map(UserDto::from);
    }

    @GetMapping("/{id}")
    public UserDto get(@PathVariable UUID id) { return UserDto.from(service.get(id)); }

    @PostMapping
    public ResponseEntity<UserDto> create(@Valid @RequestBody CreateAdminRequest req) {
        var u = service.adminCreate(req);
        return ResponseEntity.created(URI.create("/api/v1/admin/users/" + u.getId()))
                .body(UserDto.from(u));
    }

    @PatchMapping("/{id}")
    public UserDto update(@PathVariable UUID id, @RequestBody UpdateUserRequest req) {
        return UserDto.from(service.adminUpdate(id, req));
    }

    @PostMapping("/{id}/password")
    public ResponseEntity<Void> resetPassword(@PathVariable UUID id, @Valid @RequestBody ResetPasswordRequest req) {
        service.adminResetPassword(id, req);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.adminDelete(id);
        return ResponseEntity.noContent().build();
    }
}
