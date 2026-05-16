package com.lms.ai.web.dto;

public record TestProviderResult(boolean ok, String sample, String error, long latencyMs) {}
