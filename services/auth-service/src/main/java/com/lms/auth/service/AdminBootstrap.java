package com.lms.auth.service;

import com.lms.auth.domain.AppUser;
import com.lms.auth.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration
public class AdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    @Bean
    public ApplicationRunner bootstrapAdmin(AppUserRepository users,
                                            PasswordEncoder encoder,
                                            TransactionTemplate tx,
                                            @Value("${app.auth.bootstrap-admin.email:}") String email,
                                            @Value("${app.auth.bootstrap-admin.password:}") String password) {
        return args -> tx.executeWithoutResult(s -> {
            if (users.countByRole(AppUser.Role.ADMIN) > 0) {
                log.info("admin bootstrap: skipped (admins already exist)");
                return;
            }
            if (email == null || email.isBlank() || password == null || password.isBlank()) {
                log.warn("admin bootstrap: no ADMIN user exists and BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set; " +
                        "admin endpoints will be unreachable until an admin is created.");
                return;
            }
            if (users.existsByEmailIgnoreCase(email)) {
                log.warn("admin bootstrap: a user with email {} already exists with non-admin role; not promoting automatically", email);
                return;
            }
            AppUser admin = new AppUser();
            admin.setEmail(email.trim().toLowerCase());
            admin.setDisplayName("Bootstrap Admin");
            admin.setPasswordHash(encoder.encode(password));
            admin.setRole(AppUser.Role.ADMIN);
            admin.setStatus(AppUser.Status.ACTIVE);
            users.save(admin);
            log.info("admin bootstrap: created admin {}", email);
        });
    }
}
