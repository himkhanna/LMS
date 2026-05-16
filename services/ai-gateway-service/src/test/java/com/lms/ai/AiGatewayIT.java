package com.lms.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.ai.domain.ProviderType;
import com.lms.ai.repository.AiProviderRepository;
import com.lms.ai.repository.AiUsageLogRepository;
import com.lms.ai.web.dto.CompletionApiRequest;
import com.lms.ai.web.dto.CreateProviderRequest;
import com.lms.ai.provider.Message;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AiGatewayIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AiProviderRepository providers;
    @Autowired AiUsageLogRepository usageLogs;

    private MockWebServer mockOpenAi;

    @BeforeEach
    void setup() throws IOException {
        usageLogs.deleteAll();
        providers.deleteAll();
        mockOpenAi = new MockWebServer();
        mockOpenAi.start();
    }

    @AfterEach
    void teardown() throws IOException {
        mockOpenAi.shutdown();
    }

    @Test
    void registerProviderAndComplete() throws Exception {
        mockOpenAi.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                          "choices":[{"message":{"role":"assistant","content":"Hello!"}}],
                          "usage":{"prompt_tokens":5,"completion_tokens":2,"total_tokens":7}
                        }
                        """));

        var createReq = new CreateProviderRequest(
                ProviderType.OPENAI, "openai-test", "sk-test",
                "http://" + mockOpenAi.getHostName() + ":" + mockOpenAi.getPort(),
                "gpt-4o-mini", true, true, 10, null);

        String createdJson = mvc.perform(post("/api/v1/admin/providers").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        var completeReq = new CompletionApiRequest(
                null, null, List.of(Message.user("hi")), 0.7, 50, "test-case");

        mvc.perform(post("/api/v1/ai/completions").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(completeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Hello!"))
                .andExpect(jsonPath("$.totalTokens").value(7));

        mvc.perform(get("/api/v1/admin/usage").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("SUCCESS"));
    }

    @Test
    void fallsBackOnFailure() throws Exception {
        mockOpenAi.enqueue(new MockResponse().setResponseCode(500).setBody("oops"));
        mockOpenAi.enqueue(new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                          "choices":[{"message":{"role":"assistant","content":"from fallback"}}],
                          "usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}
                        }
                        """));
        String url = "http://" + mockOpenAi.getHostName() + ":" + mockOpenAi.getPort();

        var primary = new CreateProviderRequest(
                ProviderType.OPENAI, "primary", "sk-1", url, "gpt-4o-mini", true, true, 20, null);
        var secondary = new CreateProviderRequest(
                ProviderType.OPENAI, "secondary", "sk-2", url, "gpt-4o-mini", true, false, 10, null);

        mvc.perform(post("/api/v1/admin/providers").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(primary)))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/admin/providers").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(secondary)))
                .andExpect(status().isCreated());

        var completeReq = new CompletionApiRequest(
                null, null, List.of(Message.user("hello")), null, null, null);

        mvc.perform(post("/api/v1/ai/completions").with(jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(completeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("from fallback"));
    }
}
