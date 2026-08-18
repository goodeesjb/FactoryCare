package com.factorycare.backend.domain.maintenance;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionResultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.maintenance.entity.*;
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

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MaintenanceControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired InspectionResultRepository resultRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;
    User worker, manager;
    Equipment equipment;

    @BeforeEach
    void setUp() {
        maintenanceRepository.deleteAll();
        faultRepository.deleteAll();
        resultRepository.deleteAll();
        inspectionRepository.deleteAll();
        scheduleRepository.deleteAll();
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
    }

    @Test
    @DisplayName("MANAGER가 작업 생성 → 201, taskNo MT- 로 시작")
    void create_asManager() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "title", "컨베이어 수리",
            "taskType", "REPAIR"
        );
        mockMvc.perform(post("/api/maintenance")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.taskNo", startsWith("MT-")))
            .andExpect(jsonPath("$.equipmentName").value("컨베이어"))
            .andExpect(jsonPath("$.priority").value("MEDIUM"));
    }

    @Test
    @DisplayName("WORKER가 작업 생성 시도 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "title", "테스트",
            "taskType", "REPAIR"
        );
        mockMvc.perform(post("/api/maintenance")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("작업 목록 페이징 조회")
    void search() throws Exception {
        maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment).title("작업1")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(get("/api/maintenance")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    @DisplayName("작업 시작 → IN_PROGRESS + History[START] 1건")
    void start() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        var body = Map.of("content", "모터 분해 시작");
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
            .andExpect(jsonPath("$.histories.length()").value(1))
            .andExpect(jsonPath("$.histories[0].type").value("START"))
            .andExpect(jsonPath("$.histories[0].content").value("모터 분해 시작"));
    }

    @Test
    @DisplayName("작업 완료 → COMPLETED + History[COMPLETE] + completedAt + durationMinutes")
    void complete() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-002").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "시작"))))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "수리 완료", "durationMinutes", 90))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.histories.length()").value(2))
            .andExpect(jsonPath("$.histories[1].type").value("COMPLETE"))
            .andExpect(jsonPath("$.histories[1].durationMinutes").value(90))
            .andExpect(jsonPath("$.completedAt").isNotEmpty());
    }

    @Test
    @DisplayName("PENDING → complete 직접 시도 → 409")
    void complete_fromPending_409() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-003").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "결과"))))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("COMPLETED 작업 취소 → 409")
    void cancel_completed_409() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-004").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "시작"))))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "완료"))))
            .andExpect(status().isOk());

        mockMvc.perform(patch("/api/maintenance/" + task.getId() + "/cancel")
                .header("Authorization", managerToken))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("MANAGER가 담당자 배정")
    void assign() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-005").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(patch("/api/maintenance/" + task.getId() + "/assign")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("assigneeId", worker.getId()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assigneeName").value("작업자"));
    }

    @Test
    @DisplayName("ADMIN이 PENDING 작업 삭제 → 204")
    void delete_pending_asAdmin() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-006").equipment(equipment).title("삭제대상")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(delete("/api/maintenance/" + task.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("COMPLETED 작업 삭제 시도 → 409")
    void delete_completed_409() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-007").equipment(equipment).title("완료된작업")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "시작"))))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "완료"))))
            .andExpect(status().isOk());

        mockMvc.perform(delete("/api/maintenance/" + task.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isConflict());
    }
}
