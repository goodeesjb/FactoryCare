package com.factorycare.backend.domain.dashboard;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.security.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired InspectionScheduleRepository inspectionScheduleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String workerToken;
    Equipment equipment;

    @BeforeEach
    void setUp() {
        faultRepository.deleteAll();
        maintenanceRepository.deleteAll();
        inspectionScheduleRepository.deleteAll();
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User worker = userRepository.save(User.builder()
            .loginId("worker1").password(passwordEncoder.encode("pw123456"))
            .name("작업자1").role(UserRole.WORKER).build());
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), worker.getRole());

        EquipmentType type = equipmentTypeRepository.save(
            EquipmentType.builder().name("설비유형1").build());
        equipment = equipmentRepository.save(Equipment.builder()
            .equipmentNo("EQ-001").name("테스트설비").type(type).build());

        faultRepository.save(Fault.builder()
            .equipment(equipment).title("테스트 장애").severity(FaultSeverity.HIGH)
            .reportedBy(worker).build());
    }

    @Test
    @DisplayName("인증 없이 접근 시 401")
    void unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/dashboard/summary 기본 파라미터로 200 반환")
    void summary_returnsOk() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpi.totalEquipments").value(1))
            .andExpect(jsonPath("$.kpi.normalEquipments").value(1))
            .andExpect(jsonPath("$.kpi.unresolvedFaults").value(1))
            .andExpect(jsonPath("$.faultTrend").isArray())
            .andExpect(jsonPath("$.faultTrend.length()").value(6))
            .andExpect(jsonPath("$.equipmentStatusDistribution").isArray())
            .andExpect(jsonPath("$.equipmentStatusDistribution.length()").value(5))
            .andExpect(jsonPath("$.recentFaults[0].title").value("테스트 장애"))
            .andExpect(jsonPath("$.recentFaults[0].equipmentName").value("테스트설비"))
            .andExpect(jsonPath("$.recentMaintenance").isArray());
    }

    @Test
    @DisplayName("equipmentStatus=BROKEN 필터 시 totalEquipments는 고장 수만 반환")
    void summary_withBrokenFilter_filtersTotalCount() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", workerToken)
                .param("equipmentStatus", "BROKEN"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpi.totalEquipments").value(0));
    }

    @Test
    @DisplayName("period=7 파라미터 적용 시 200 반환")
    void summary_withPeriod7_returnsOk() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", workerToken)
                .param("period", "7"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpi").exists());
    }
}
