package com.lms.course.service;

import java.util.UUID;

public class CourseNotFoundException extends RuntimeException {
    public CourseNotFoundException(String entity, UUID id) {
        super("%s not found: %s".formatted(entity, id));
    }
}
