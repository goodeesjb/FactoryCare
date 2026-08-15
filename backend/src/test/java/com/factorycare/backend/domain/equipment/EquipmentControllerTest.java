package com.factorycare.backend.domain.equipment;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.equipment.repository.EquipmentStatusHistoryRepository;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionResultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
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
class EquipmentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired EquipmentStatusHistoryRepository statusHistoryRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired InspectionResultRepository inspectionResultRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionScheduleRepository inspectionScheduleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken;
    String managerToken;
    String workerToken;
    User worker;

    @BeforeEach
    void setUp() {
        faultRepository.deleteAll();
        inspectionResultRepository.deleteAll();
        inspectionRepository.deleteAll();
        inspectionScheduleRepository.deleteAll();
        statusHistoryRepository.deleteAll();
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
                .loginId("admin01").password(passwordEncoder.encode("pw")).name("관리자").role(UserRole.ADMIN).build());
        User manager = userRepository.save(User.builder()
                .loginId("manager01").password(passwordEncoder.encode("pw")).name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
                .loginId("worker01").password(passwordEncoder.encode("pw")).name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);
    }

    @Test
    @DisplayName("MANAGER가 설비 등록 → 201")
    void create_asManager() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        var body = Map.of(
                "equipmentNo", "EQ-001",
                "name", "로봇팔 A",
                "typeId", type.getId(),
                "location", "1공장 A구역",
                "assigneeId", worker.getId()
        );

        mockMvc.perform(post("/api/equipments")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.equipmentNo").value("EQ-001"))
                .andExpect(jsonPath("$.status").value("NORMAL"));
    }

    @Test
    @DisplayName("WORKER가 설비 등록 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of("equipmentNo", "EQ-001", "name", "로봇팔");

        mockMvc.perform(post("/api/equipments")
                        .header("Authorization", workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("설비 목록 필터 검색 — 설비번호 부분검색")
    void search_withEquipmentNoFilter() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("컨베이어B").type(type).assignee(worker).build());

        mockMvc.perform(get("/api/equipments").param("equipmentNo", "EQ-001")
                        .header("Authorization", workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].equipmentNo").value("EQ-001"));
    }

    @Test
    @DisplayName("설비 상세 조회")
    void getOne() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        mockMvc.perform(get("/api/equipments/" + eq.getId())
                        .header("Authorization", workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentNo").value("EQ-001"))
                .andExpect(jsonPath("$.type.name").value("로봇암"));
    }

    @Test
    @DisplayName("설비 수정")
    void update_asManager() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        var body = Map.of("name", "로봇팔B", "location", "2공장 B구역");

        mockMvc.perform(patch("/api/equipments/" + eq.getId())
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("로봇팔B"));
    }

    @Test
    @DisplayName("ADMIN이 설비 비활성화")
    void deactivate_asAdmin() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        mockMvc.perform(delete("/api/equipments/" + eq.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        // 비활성화 후 조회 → 400
        mockMvc.perform(get("/api/equipments/" + eq.getId())
                        .header("Authorization", workerToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("MANAGER가 상태변경 → 이력 자동 기록")
    void changeStatus_andVerifyHistory() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        var body = Map.of("newStatus", "BROKEN", "reason", "모터 과열 감지");

        mockMvc.perform(patch("/api/equipments/" + eq.getId() + "/status")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BROKEN"));

        mockMvc.perform(get("/api/equipments/" + eq.getId() + "/status-histories")
                        .header("Authorization", workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].newStatus").value("BROKEN"))
                .andExpect(jsonPath("$[0].reason").value("모터 과열 감지"))
                .andExpect(jsonPath("$[0].previousStatus").value("NORMAL"));
    }

    @Test
    @DisplayName("reason 없이 상태변경 → 400")
    void changeStatus_noReason_400() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        var body = Map.of("newStatus", "BROKEN");

        mockMvc.perform(patch("/api/equipments/" + eq.getId() + "/status")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }
}
