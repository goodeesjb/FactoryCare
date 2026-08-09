package com.factorycare.backend.domain.equipment;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
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
class EquipmentTypeControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken;
    String managerToken;
    String workerToken;

    @BeforeEach
    void setUp() {
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
                .loginId("admin01").password(passwordEncoder.encode("pw")).name("관리자").role(UserRole.ADMIN).build());
        User manager = userRepository.save(User.builder()
                .loginId("manager01").password(passwordEncoder.encode("pw")).name("매니저").role(UserRole.MANAGER).build());
        User worker = userRepository.save(User.builder()
                .loginId("worker01").password(passwordEncoder.encode("pw")).name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);
    }

    @Test
    @DisplayName("전체 역할이 유형 목록 조회 가능")
    void getAll() throws Exception {
        equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").description("다관절 로봇").build());

        mockMvc.perform(get("/api/equipment-types").header("Authorization", workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("로봇암"));
    }

    @Test
    @DisplayName("ADMIN이 유형 생성 → 201")
    void create_asAdmin() throws Exception {
        var body = Map.of("name", "컨베이어", "description", "컨베이어 벨트");

        mockMvc.perform(post("/api/equipment-types")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("컨베이어"));
    }

    @Test
    @DisplayName("MANAGER가 유형 생성 → 403")
    void create_asManager_403() throws Exception {
        var body = Map.of("name", "컨베이어");

        mockMvc.perform(post("/api/equipment-types")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("중복 유형명 생성 → 409")
    void create_duplicateName_409() throws Exception {
        equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        var body = Map.of("name", "로봇암");

        mockMvc.perform(post("/api/equipment-types")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("ADMIN이 유형 수정")
    void update_asAdmin() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        var body = Map.of("name", "산업용 로봇");

        mockMvc.perform(patch("/api/equipment-types/" + type.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("산업용 로봇"));
    }

    @Test
    @DisplayName("ADMIN이 유형 삭제")
    void delete_asAdmin() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("임시유형").build());

        mockMvc.perform(delete("/api/equipment-types/" + type.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }
}
