package com.lms.course.template;

import java.util.List;

public record CourseTemplate(
        String id,
        String name,
        String description,
        List<TemplateModule> modules
) {
    public record TemplateModule(String title, List<TemplateLesson> lessons) {}
    public record TemplateLesson(String title, String content, int durationSecs) {}

    public int lessonCount() {
        return modules.stream().mapToInt(m -> m.lessons().size()).sum();
    }
}
