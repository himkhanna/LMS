package com.lms.course;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.course.web.dto.CreateCourseRequest;
import com.lms.course.web.dto.CreateLessonRequest;
import com.lms.course.web.dto.CreateModuleRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class CourseControllerIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void createCourseAndAddModuleAndLesson() throws Exception {
        var courseBody = json.writeValueAsString(new CreateCourseRequest("Intro to LMS", "first course"));
        var courseId = mvc.perform(post("/api/v1/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(courseBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        String id = json.readTree(courseId).get("id").asText();

        var moduleBody = json.writeValueAsString(new CreateModuleRequest("Module 1"));
        var moduleResp = mvc.perform(post("/api/v1/courses/" + id + "/modules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(moduleBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String moduleId = json.readTree(moduleResp).get("id").asText();

        var lessonBody = json.writeValueAsString(new CreateLessonRequest("Lesson 1", "hello", 60));
        mvc.perform(post("/api/v1/courses/modules/" + moduleId + "/lessons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(lessonBody))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/courses/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modules[0].lessons[0].title").value("Lesson 1"));
    }
}
