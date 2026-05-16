package com.lms.course.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class CourseEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(CourseEventPublisher.class);

    private final ApplicationEventPublisher publisher;

    public CourseEventPublisher(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void publish(Object event) {
        publisher.publishEvent(event);
    }

    @EventListener
    public void onPublished(CoursePublishedEvent event) {
        log.info("event=course-published courseId={} publishedAt={}", event.courseId(), event.publishedAt());
    }

    @EventListener
    public void onArchived(CourseArchivedEvent event) {
        log.info("event=course-archived courseId={} archivedAt={}", event.courseId(), event.archivedAt());
    }
}
