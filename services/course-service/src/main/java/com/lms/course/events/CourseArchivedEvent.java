package com.lms.course.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CourseArchivedEvent(UUID courseId, OffsetDateTime archivedAt) {}
