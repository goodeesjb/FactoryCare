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

import java.util.Map;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PartControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired PartRepository partRepository;
    @Autowired PartUsageRepository partUsageRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;
    User worker, manager;
    Equipment equipment;
    MaintenanceTask task;

    @BeforeEach
    void setUp() {
        partUsageRepository.deleteAll();
        partRepository.deleteAll();
        maintenanceRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
            .loginId("admin01").password(passwordEncoder.encode("pw"))
            .name("관리자").role(UserRole.ADMIN).build());
        manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        equipment = equipmentRepository.save(
            Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());

        task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment)
            .title("테스트 작업").taskType(MaintenanceType.REPAIR)
            .createdBy(worker).build());
    }

    @Test
    @DisplayName("MANAGER가 부품 등록 → 201, partNo PT-로 시작")
    void create_asManager() throws Exception {
        var body = Map.of(
            "name", "볼베어링",
            "manufacturer", "NSK",
            "stockQuantity", 100,
            "minimumStock", 10,
            "storageLocation", "A-01"
        );
        mockMvc.perform(post("/api/parts")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.partNo", startsWith("PT-")))
            .andExpect(jsonPath("$.name").value("볼베어링"))
            .andExpect(jsonPath("$.stockStatus").value("NORMAL"))
            .andExpect(jsonPath("$.stockQuantity").value(100));
    }

    @Test
    @DisplayName("WORKER가 부품 등록 시도 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of("name", "볼트", "stockQuantity", 50, "minimumStock", 5);
        mockMvc.perform(post("/api/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("keyword 검색 — 이름 포함")
    void search_byKeyword() throws Exception {
        partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링").manufacturer("NSK")
            .stockQuantity(100).minimumStock(10).build());
        partRepository.save(Part.builder()
            .partNo("PT-2026-002").name("오일씰").manufacturer("NOK")
            .stockQuantity(50).minimumStock(5).build());

        mockMvc.perform(get("/api/parts")
                .header("Authorization", workerToken)
                .param("keyword", "볼"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].name").value("볼베어링"));
    }

    @Test
    @DisplayName("stockStatus=LOW 필터 — 최소재고 이하 부품만")
    void search_byStockStatus_LOW() throws Exception {
        partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(5).minimumStock(10).build()); // LOW
        partRepository.save(Part.builder()
            .partNo("PT-2026-002").name("오일씰")
            .stockQuantity(50).minimumStock(5).build()); // NORMAL

        mockMvc.perform(get("/api/parts")
                .header("Authorization", workerToken)
                .param("stockStatus", "LOW"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].stockStatus").value("LOW"));
    }

    @Test
    @DisplayName("ADMIN이 부품 소프트 삭제 → 204, 목록에서 제외")
    void delete_soft() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(100).minimumStock(10).build());

        mockMvc.perform(delete("/api/parts/" + part.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/parts")
                .header("Authorization", workerToken))
            .andExpect(jsonPath("$.content.length()").value(0));
    }

    @Test
    @DisplayName("MANAGER가 재고 조정 → stockQuantity 변경")
    void adjustStock() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(10).minimumStock(5).build());

        mockMvc.perform(patch("/api/parts/" + part.getId() + "/stock")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("newQuantity", 200))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stockQuantity").value(200))
            .andExpect(jsonPath("$.stockStatus").value("NORMAL"));
    }

    @Test
    @DisplayName("WORKER가 부품 사용 등록 → 재고 차감 + 사용 목록 1건")
    void addPartUsage_stockDecreased() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(100).minimumStock(10).build());

        var body = Map.of("partId", part.getId(), "quantity", 3, "note", "모터 교체");
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.partName").value("볼베어링"))
            .andExpect(jsonPath("$.quantity").value(3));

        mockMvc.perform(get("/api/parts/" + part.getId())
                .header("Authorization", workerToken))
            .andExpect(jsonPath("$.stockQuantity").value(97));
    }

    @Test
    @DisplayName("재고 초과 사용 → 409")
    void addPartUsage_insufficientStock_409() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(2).minimumStock(0).build());

        var body = Map.of("partId", part.getId(), "quantity", 10);
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("부품 사용 삭제 → 재고 복구")
    void deletePartUsage_stockRestored() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(100).minimumStock(10).build());

        var body = Map.of("partId", part.getId(), "quantity", 5);
        String response = mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        Long usageId = objectMapper.readTree(response).get("id").longValue();

        mockMvc.perform(delete("/api/maintenance/" + task.getId() + "/parts/" + usageId)
                .header("Authorization", workerToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/parts/" + part.getId())
                .header("Authorization", workerToken))
            .andExpect(jsonPath("$.stockQuantity").value(100));
    }

    @Test
    @DisplayName("취소된 작업의 부품 사용 이력 삭제 → 409")
    void deletePartUsage_onCancelledTask_409() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-099").name("테스트부품")
            .stockQuantity(100).minimumStock(0).build());

        // task를 IN_PROGRESS로 전환 후 취소
        var startBody = Map.of("content", "시작");
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(startBody)))
            .andExpect(status().isOk());

        mockMvc.perform(patch("/api/maintenance/" + task.getId() + "/cancel")
                .header("Authorization", managerToken))
            .andExpect(status().isOk());

        // 취소된 작업에 부품 추가 → 409
        var body = Map.of("partId", part.getId(), "quantity", 1);
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }
}
