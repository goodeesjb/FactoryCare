package com.factorycare.backend.domain.user;

import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionResultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceHistoryRepository;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.security.JwtProvider;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired InspectionResultRepository inspectionResultRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionScheduleRepository inspectionScheduleRepository;
    @Autowired MaintenanceHistoryRepository maintenanceHistoryRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken;

    @BeforeEach
    void setUp() {
        maintenanceHistoryRepository.deleteAll();
        maintenanceRepository.deleteAll();
        faultRepository.deleteAll();
        inspectionResultRepository.deleteAll();
        inspectionRepository.deleteAll();
        inspectionScheduleRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();
        User admin = User.builder()
                .loginId("admin01")
                .password(passwordEncoder.encode("password123"))
                .name("관리자")
                .role(UserRole.ADMIN)
                .build();
        User saved = userRepository.save(admin);
        adminToken = "Bearer " + jwtProvider.generateAccessToken(saved.getId(), UserRole.ADMIN);
    }

    @Test
    @DisplayName("ADMIN이 사용자 목록 조회")
    void getAll_asAdmin() throws Exception {
        mockMvc.perform(get("/api/users")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("ADMIN이 새 사용자 생성 → 201")
    void createUser_asAdmin() throws Exception {
        var body = Map.of(
                "loginId", "worker01",
                "password", "password123",
                "name", "작업자1",
                "role", "WORKER"
        );

        mockMvc.perform(post("/api/users")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.loginId").value("worker01"));
    }

    @Test
    @DisplayName("토큰 없이 사용자 목록 조회 → 401")
    void getAll_noToken_401() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized());
    }
}
