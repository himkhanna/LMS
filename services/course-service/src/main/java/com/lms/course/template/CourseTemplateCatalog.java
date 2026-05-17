package com.lms.course.template;

import com.lms.course.template.CourseTemplate.TemplateLesson;
import com.lms.course.template.CourseTemplate.TemplateModule;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class CourseTemplateCatalog {

    private final Map<String, CourseTemplate> templates;

    public CourseTemplateCatalog() {
        Map<String, CourseTemplate> m = new LinkedHashMap<>();
        for (CourseTemplate t : seed()) {
            m.put(t.id(), t);
        }
        this.templates = Map.copyOf(m);
    }

    public List<CourseTemplate> list() {
        return List.copyOf(templates.values());
    }

    public Optional<CourseTemplate> find(String id) {
        return Optional.ofNullable(templates.get(id));
    }

    private static List<CourseTemplate> seed() {
        return List.of(
                new CourseTemplate(
                        "employee-onboarding",
                        "Employee Onboarding",
                        "A first-week guide for new hires — culture, policies, tools and people.",
                        List.of(
                                new TemplateModule("Welcome", List.of(
                                        new TemplateLesson("Welcome message",
                                                "<p>A warm welcome from leadership and a quick overview of the company's mission and values.</p>",
                                                60),
                                        new TemplateLesson("Company history",
                                                "<p>How we started, where we are today, and where we're going.</p>",
                                                90)
                                )),
                                new TemplateModule("Policies", List.of(
                                        new TemplateLesson("Code of conduct",
                                                "<p>Expected behavior, ethics, and how we treat each other.</p>",
                                                120),
                                        new TemplateLesson("Time off and benefits",
                                                "<p>Vacation, sick leave, health insurance, retirement plans.</p>",
                                                120),
                                        new TemplateLesson("Working hours and remote policy",
                                                "<p>Core hours, flexibility, and remote work expectations.</p>",
                                                90)
                                )),
                                new TemplateModule("Tools and Access", List.of(
                                        new TemplateLesson("Account setup",
                                                "<p>How to access email, chat, and the main internal systems.</p>",
                                                120),
                                        new TemplateLesson("Security basics",
                                                "<p>Password policy, MFA, and reporting suspicious activity.</p>",
                                                120)
                                )),
                                new TemplateModule("Your Team", List.of(
                                        new TemplateLesson("Org chart",
                                                "<p>How teams are organized and who reports to whom.</p>",
                                                60),
                                        new TemplateLesson("Meet your manager",
                                                "<p>One-on-one rhythm, expectations, and how to get help.</p>",
                                                90)
                                )),
                                new TemplateModule("First Week Goals", List.of(
                                        new TemplateLesson("Your first sprint",
                                                "<p>Concrete tasks and milestones for week one.</p>",
                                                120),
                                        new TemplateLesson("Feedback and check-ins",
                                                "<p>How and when to give and receive feedback during onboarding.</p>",
                                                90)
                                ))
                        )
                ),
                new CourseTemplate(
                        "compliance-basics",
                        "Compliance Basics",
                        "Annual refresher on workplace conduct, data privacy, and security.",
                        List.of(
                                new TemplateModule("Code of Conduct", List.of(
                                        new TemplateLesson("Workplace behavior",
                                                "<p>Respect, anti-harassment, and inclusive language.</p>",
                                                180),
                                        new TemplateLesson("Conflicts of interest",
                                                "<p>What counts as a conflict and how to disclose one.</p>",
                                                120)
                                )),
                                new TemplateModule("Data Privacy", List.of(
                                        new TemplateLesson("Customer data handling",
                                                "<p>What data we collect, where it lives, and who can access it.</p>",
                                                180),
                                        new TemplateLesson("GDPR and regional rules",
                                                "<p>Key regulations and our obligations.</p>",
                                                180)
                                )),
                                new TemplateModule("Information Security", List.of(
                                        new TemplateLesson("Passwords and devices",
                                                "<p>Strong passwords, MFA, and device hygiene.</p>",
                                                120),
                                        new TemplateLesson("Phishing and social engineering",
                                                "<p>How to spot a phishing email and what to do.</p>",
                                                180)
                                )),
                                new TemplateModule("Reporting Issues", List.of(
                                        new TemplateLesson("How to report a concern",
                                                "<p>Channels, anonymity, and our non-retaliation policy.</p>",
                                                120)
                                ))
                        )
                ),
                new CourseTemplate(
                        "product-training",
                        "Product Training",
                        "Bring teams up to speed on what we sell, how it works, and who it's for.",
                        List.of(
                                new TemplateModule("Overview", List.of(
                                        new TemplateLesson("What we do",
                                                "<p>The problem we solve and our high-level approach.</p>",
                                                120),
                                        new TemplateLesson("Who we serve",
                                                "<p>Target customers, industries, and personas.</p>",
                                                90)
                                )),
                                new TemplateModule("Features", List.of(
                                        new TemplateLesson("Core features",
                                                "<p>The headline capabilities every user touches.</p>",
                                                180),
                                        new TemplateLesson("Advanced features",
                                                "<p>Power-user and admin capabilities.</p>",
                                                180)
                                )),
                                new TemplateModule("Use Cases", List.of(
                                        new TemplateLesson("Common workflows",
                                                "<p>The top three jobs-to-be-done we enable.</p>",
                                                180),
                                        new TemplateLesson("Integrations",
                                                "<p>Where we fit in the customer's existing stack.</p>",
                                                120)
                                )),
                                new TemplateModule("Plans and Pricing", List.of(
                                        new TemplateLesson("Plans overview",
                                                "<p>How our tiers differ and what's included in each.</p>",
                                                120)
                                ))
                        )
                ),
                new CourseTemplate(
                        "sales-101",
                        "Sales 101",
                        "Foundations of a healthy sales cycle from prospecting to close.",
                        List.of(
                                new TemplateModule("Prospecting", List.of(
                                        new TemplateLesson("Finding fit-for-need leads",
                                                "<p>Ideal customer profile and lead sources.</p>",
                                                180),
                                        new TemplateLesson("Outbound outreach",
                                                "<p>Email, calls, and social — when to use each.</p>",
                                                180)
                                )),
                                new TemplateModule("Discovery", List.of(
                                        new TemplateLesson("Discovery call structure",
                                                "<p>Open with context, dig into pain, qualify budget and timing.</p>",
                                                240),
                                        new TemplateLesson("Question frameworks",
                                                "<p>BANT, MEDDIC, SPIN — when each helps.</p>",
                                                180)
                                )),
                                new TemplateModule("Demo", List.of(
                                        new TemplateLesson("Tailoring the demo",
                                                "<p>Show the parts that solve their problem, not the full tour.</p>",
                                                180)
                                )),
                                new TemplateModule("Closing", List.of(
                                        new TemplateLesson("Handling objections",
                                                "<p>Common objections and concrete responses.</p>",
                                                180),
                                        new TemplateLesson("Negotiation and close",
                                                "<p>Anchoring, concessions, and getting to signature.</p>",
                                                180)
                                ))
                        )
                )
        );
    }
}
