package com.lms.course.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "lesson")
public class Lesson {

    @Id
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "module_id", nullable = false)
    private CourseModule module;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String content;

    @Column(nullable = false)
    private int position;

    @Column(name = "duration_secs")
    private Integer durationSecs;

    /** Optional video URL — direct .mp4, YouTube, Vimeo or Teams Stream. */
    @Column(name = "video_url", columnDefinition = "text")
    private String videoUrl;

    /** Cached provider classification: "YOUTUBE" / "VIMEO" / "FILE" / null. */
    @Column(name = "video_provider", length = 32)
    private String videoProvider;

    /** Optional narration script read aloud in the slideshow viewer via
     *  the browser's SpeechSynthesis API. */
    @Column(name = "voice_over_text", columnDefinition = "text")
    private String voiceOverText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public CourseModule getModule() { return module; }
    public void setModule(CourseModule module) { this.module = module; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public Integer getDurationSecs() { return durationSecs; }
    public void setDurationSecs(Integer durationSecs) { this.durationSecs = durationSecs; }
    public String getVideoUrl() { return videoUrl; }
    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl == null || videoUrl.isBlank() ? null : videoUrl.trim();
        this.videoProvider = classify(this.videoUrl);
    }
    public String getVideoProvider() { return videoProvider; }
    public String getVoiceOverText() { return voiceOverText; }
    public void setVoiceOverText(String voiceOverText) {
        this.voiceOverText = voiceOverText == null || voiceOverText.isBlank() ? null : voiceOverText;
    }

    /**
     * Classify a URL so the SPA renders the right player. We never store
     * media inline — only the URL — so this is a lightweight string match.
     */
    private static String classify(String url) {
        if (url == null) return null;
        String lower = url.toLowerCase();
        if (lower.contains("youtube.com") || lower.contains("youtu.be")) return "YOUTUBE";
        if (lower.contains("vimeo.com")) return "VIMEO";
        if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".m4v")) return "FILE";
        return "URL";
    }
}
