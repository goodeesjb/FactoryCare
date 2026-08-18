package com.factorycare.backend.domain.fault;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.entity.*;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionResultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
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
class FaultControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired InspectionResultRepository resultRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;
    User worker;
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
        User manager = userRepository.save(User.builder()
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
    @DisplayName("WORKER가 장애 등록 → 201")
    void create_asWorker() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "title", "모터 과열",
            "severity", "HIGH"
        );
        mockMvc.perform(post("/api/faults")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("REPORTED"))
            .andExpect(jsonPath("$.equipmentName").value("컨베이어"))
            .andExpect(jsonPath("$.severity").value("HIGH"))
            .andExpect(jsonPath("$.reportedByName").value("작업자"));
    }

    @Test
    @DisplayName("장애 목록 페이징 조회")
    void search() throws Exception {
        faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.HIGH).reportedBy(worker).build());

        mockMvc.perform(get("/api/faults")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    @DisplayName("MANAGER가 상태를 CONFIRMED로 변경 + 이력 1건")
    void changeStatus_toConfirmed() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.MEDIUM).reportedBy(worker).build());

        var body = Map.of("status", "CONFIRMED", "reason", "현장 확인 완료");
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/status")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.statusHistories.length()").value(1))
            .andExpect(jsonPath("$.statusHistories[0].reason").value("현장 확인 완료"));
    }

    @Test
    @DisplayName("WORKER가 상태변경 시도 → 403")
    void changeStatus_asWorker_403() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.LOW).reportedBy(worker).build());

        var body = Map.of("status", "CONFIRMED", "reason", "테스트");
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/status")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("잘못된 상태 전이 → 409")
    void changeStatus_invalidTransition_409() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.LOW).reportedBy(worker).build());

        var body = Map.of("status", "CLOSED", "reason", "바로 닫기");
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/status")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("MANAGER가 담당자 배정")
    void assign() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.MEDIUM).reportedBy(worker).build());

        var body = Map.of("assigneeId", worker.getId());
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/assign")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assignedToName").value("작업자"));
    }

    @Test
    @DisplayName("ADMIN이 장애 삭제 → 204")
    void delete_asAdmin() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("삭제대상")
            .severity(FaultSeverity.LOW).reportedBy(worker).build());

        mockMvc.perform(delete("/api/faults/" + fault.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());
    }
}
