package com.lms.auth;

import com.lms.auth.microsoft.MicrosoftOidcProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(MicrosoftOidcProperties.class)
public class AuthServiceApplication {
    public static void main(String[] args) { SpringApplication.run(AuthServiceApplication.class, args); }
}
