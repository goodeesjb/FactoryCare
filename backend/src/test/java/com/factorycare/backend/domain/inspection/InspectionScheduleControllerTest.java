package com.factorycare.backend.domain.inspection;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
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

import java.time.LocalDate;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InspectionScheduleControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired InspectionChecklistRepository checklistRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionResultRepository resultRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String managerToken, workerToken;
    User worker;
    Equipment equipment;
    InspectionChecklist checklist;

    @BeforeEach
    void setUp() {
        resultRepository.deleteAll();
        inspectionRepository.deleteAll();
        scheduleRepository.deleteAll();
        checklistRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        User manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        equipment = equipmentRepository.save(Equipment.builder()
            .equipmentNo("EQ-001").name("컨베이어").build());
        checklist = checklistRepository.save(
            InspectionChecklist.builder().name("일일 점검").build());
    }

    @Test
    @DisplayName("MANAGER가 일정 생성 → 201")
    void create_asManager() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "checklistId", checklist.getId(),
            "assigneeId", worker.getId(),
            "scheduledDate", LocalDate.now().plusDays(1).toString(),
            "inspectionType", "DAILY"
        );
        mockMvc.perform(post("/api/inspection-schedules")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("SCHEDULED"))
            .andExpect(jsonPath("$.equipmentName").value("컨베이어"));
    }

    @Test
    @DisplayName("WORKER가 일정 생성 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "checklistId", checklist.getId(),
            "assigneeId", worker.getId(),
            "scheduledDate", LocalDate.now().toString(),
            "inspectionType", "DAILY"
        );
        mockMvc.perform(post("/api/inspection-schedules")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("일정 start → Inspection 생성 (201)")
    void start_createsInspection() throws Exception {
        InspectionSchedule schedule = scheduleRepository.save(
            InspectionSchedule.builder()
                .equipment(equipment).checklist(checklist)
                .assignee(worker).scheduledDate(LocalDate.now())
                .inspectionType(InspectionScheduleType.DAILY).build());

        mockMvc.perform(post("/api/inspection-schedules/" + schedule.getId() + "/start")
                .header("Authorization", managerToken))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @DisplayName("일정 목록 페이징 조회")
    void getList() throws Exception {
        scheduleRepository.save(InspectionSchedule.builder()
            .equipment(equipment).checklist(checklist).assignee(worker)
            .scheduledDate(LocalDate.now()).inspectionType(InspectionScheduleType.DAILY).build());

        mockMvc.perform(get("/api/inspection-schedules")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }
}