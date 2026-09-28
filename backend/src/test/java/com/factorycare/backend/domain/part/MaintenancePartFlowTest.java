package com.factorycare.backend.domain.part;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.repository.PartRepository;
import com.factorycare.backend.domain.part.repository.PartUsageRepository;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MaintenancePartFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired PartRepository partRepository;
    @Autowired PartUsageRepository partUsageRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String managerToken, workerToken;
    Equipment equipment;
    Part part;
    User worker, manager;

    @BeforeEach
    void setUp() {
        partUsageRepository.deleteAll();
        maintenanceRepository.deleteAll();
        partRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        equipment = equipmentRepository.save(
            Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());
        part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("베어링A").manufacturer("한국부품")
            .stockQuantity(20).minimumStock(5).build());
    }

    @Test
    @DisplayName("전체 플로우: 작업생성 → 부품사용(재고감소) → 부품삭제(재고복원) → 작업완료 → 완료후부품추가차단")
    void fullFlow() throws Exception {
        // 1. 작업 생성
        var createBody = Map.of("equipmentId", equipment.getId(), "title", "모터 수리", "taskType", "REPAIR");
        MvcResult createResult = mockMvc.perform(post("/api/maintenance")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andReturn();

        Long taskId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // 2. 작업 시작
        mockMvc.perform(post("/api/maintenance/" + taskId + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "시작"))))
            .andExpect(status().isOk());

        // 3. 부품 사용 등록 (재고 20 → 17)
        var usageBody = Map.of("partId", part.getId(), "quantity", 3, "note", "베어링 교체");
        MvcResult usageResult = mockMvc.perform(post("/api/maintenance/" + taskId + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(usageBody)))
            .andExpect(status().isCreated())
            .andReturn();

        Long usageId = objectMapper.readTree(usageResult.getResponse().getContentAsString()).get("id").asLong();
        assertThat(partRepository.findById(part.getId()).get().getStockQuantity()).isEqualTo(17);

        // 4. 부품 사용 삭제 (재고 17 → 20 복원)
        mockMvc.perform(delete("/api/maintenance/" + taskId + "/parts/" + usageId)
                .header("Authorization", workerToken))
            .andExpect(status().isNoContent());

        assertThat(partRepository.findById(part.getId()).get().getStockQuantity()).isEqualTo(20);

        // 5. 다시 부품 등록 (재고 20 → 15)
        var usageBody2 = Map.of("partId", part.getId(), "quantity", 5);
        mockMvc.perform(post("/api/maintenance/" + taskId + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(usageBody2)))
            .andExpect(status().isCreated());

        // 6. 작업 완료
        mockMvc.perform(post("/api/maintenance/" + taskId + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "완료", "durationMinutes", 60))))
            .andExpect(status().isOk());

        // 7. 완료된 작업에 부품 추가 시도 → 409
        mockMvc.perform(post("/api/maintenance/" + taskId + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("partId", part.getId(), "quantity", 1))))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("재고 부족 시 부품 사용 등록 → 409")
    void partUsage_insufficientStock_409() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());
        task.start();
        maintenanceRepository.save(task);

        var body = Map.of("partId", part.getId(), "quantity", 999);
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }
}
