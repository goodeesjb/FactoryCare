package com.factorycare.backend.auth;

import com.factorycare.backend.domain.inspection.repository.InspectionResultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired InspectionResultRepository inspectionResultRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionScheduleRepository inspectionScheduleRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        inspectionResultRepository.deleteAll();
        inspectionRepository.deleteAll();
        inspectionScheduleRepository.deleteAll();
        userRepository.deleteAll();
        User user = User.builder()
                .loginId("admin01")
                .password(passwordEncoder.encode("password123"))
                .name("관리자")
                .role(UserRole.ADMIN)
                .build();
        userRepository.save(user);
    }

    @Test
    @DisplayName("올바른 자격증명으로 로그인 성공 → accessToken 반환")
    void login_success() throws Exception {
        var body = Map.of("loginId", "admin01", "password", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    @DisplayName("잘못된 비밀번호로 로그인 → 401")
    void login_wrong_password() throws Exception {
        var body = Map.of("loginId", "admin01", "password", "wrong");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }
}
