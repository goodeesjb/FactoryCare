package com.factorycare.backend.domain.fault;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
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
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FaultAutoCreateTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired InspectionChecklistRepository checklistRepository;
    @Autowired InspectionChecklistItemRepository checklistItemRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionResultRepository resultRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String workerToken;
    User worker;
    InspectionChecklistItem item1, item2;
    Inspection inspection;

    @BeforeEach
    void setUp() {
        faultRepository.deleteAll();
        resultRepository.deleteAll();
        inspectionRepository.deleteAll();
        scheduleRepository.deleteAll();
        checklistRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        Equipment eq = equipmentRepository.save(
            Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());

        InspectionChecklist checklist = checklistRepository.save(
            InspectionChecklist.builder().name("일일점검").build());

        item1 = checklistItemRepository.save(InspectionChecklistItem.builder()
            .checklist(checklist).itemName("모터 온도").itemOrder(1).build());
        item2 = checklistItemRepository.save(InspectionChecklistItem.builder()
            .checklist(checklist).itemName("오일 누유").itemOrder(2).build());

        InspectionSchedule schedule = scheduleRepository.save(
            InspectionSchedule.builder().equipment(eq).checklist(checklist)
                .assignee(worker).scheduledDate(LocalDate.now())
                .inspectionType(InspectionScheduleType.DAILY).build());
        schedule.startInspection();
        scheduleRepository.save(schedule);

        inspection = inspectionRepository.save(
            Inspection.builder().schedule(schedule).inspector(worker).build());
    }

    @Test
    @DisplayName("FAIL 항목 포함 완료 → Fault 자동 생성")
    void complete_withFail_createsFault() throws Exception {
        var body = Map.of("results", List.of(
            Map.of("checklistItemId", item1.getId(), "result", "PASS"),
            Map.of("checklistItemId", item2.getId(), "result", "FAIL", "note", "오일 누유 발견")
        ));
        mockMvc.perform(post("/api/inspections/" + inspection.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk());

        List<?> faults = faultRepository.findAll();
        assertThat(faults).hasSize(1);
    }

    @Test
    @DisplayName("PASS만 완료 → Fault 미생성")
    void complete_allPass_noFault() throws Exception {
        var body = Map.of("results", List.of(
            Map.of("checklistItemId", item1.getId(), "result", "PASS"),
            Map.of("checklistItemId", item2.getId(), "result", "PASS")
        ));
        mockMvc.perform(post("/api/inspections/" + inspection.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk());

        assertThat(faultRepository.findAll()).isEmpty();
    }
}
