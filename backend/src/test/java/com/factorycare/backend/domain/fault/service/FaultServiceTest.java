package com.factorycare.backend.domain.fault.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.dto.FaultCreateRequest;
import com.factorycare.backend.domain.fault.dto.FaultResponse;
import com.factorycare.backend.domain.fault.dto.FaultStatusChangeRequest;
import com.factorycare.backend.domain.fault.dto.FaultAssignRequest;
import com.factorycare.backend.domain.fault.entity.*;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.Inspection;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FaultServiceTest {

    @InjectMocks FaultService faultService;
    @Mock FaultRepository faultRepository;
    @Mock EquipmentRepository equipmentRepository;
    @Mock UserRepository userRepository;

    Equipment equipment;
    User reporter;

    @BeforeEach
    void setUp() {
        equipment = mock(Equipment.class);
        given(equipment.getId()).willReturn(1L);
        given(equipment.getName()).willReturn("컨베이어");

        reporter = mock(User.class);
        given(reporter.getId()).willReturn(2L);
        given(reporter.getName()).willReturn("작업자");
    }

    @Test
    @DisplayName("장애 생성 성공 — title·severity 올바르게 저장")
    void create_success() {
        FaultCreateRequest req = new FaultCreateRequest(1L, "모터 이상", "소음 발생", FaultSeverity.HIGH);
        given(equipmentRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(equipment));
        given(userRepository.findById(2L)).willReturn(Optional.of(reporter));
        given(faultRepository.save(any(Fault.class))).willAnswer(inv -> inv.getArgument(0));

        FaultResponse resp = faultService.create(req, 2L);

        assertThat(resp.title()).isEqualTo("모터 이상");
        assertThat(resp.severity()).isEqualTo(FaultSeverity.HIGH);
        assertThat(resp.status()).isEqualTo(FaultStatus.REPORTED);
        verify(faultRepository).save(argThat(f -> "모터 이상".equals(f.getTitle())));
    }

    @Test
    @DisplayName("존재하지 않는 설비로 장애 생성 → IllegalArgumentException")
    void create_equipmentNotFound_throws() {
        FaultCreateRequest req = new FaultCreateRequest(999L, "테스트", null, FaultSeverity.LOW);
        given(equipmentRepository.findByIdAndActiveTrue(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> faultService.create(req, 2L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("설비를 찾을 수 없습니다");
    }

    @Test
    @DisplayName("점검이상으로 자동 장애 생성 — title에 '[점검이상]' 접두사")
    void createFromInspectionResult_titlePrefix() {
        // InspectionResult mock 구성
        InspectionResult result = mock(InspectionResult.class);
        Inspection inspection = mock(Inspection.class);
        InspectionSchedule schedule = mock(InspectionSchedule.class);
        given(result.getItemName()).willReturn("오일 누유");
        given(result.getNote()).willReturn("심각한 누유");
        given(result.getInspection()).willReturn(inspection);
        given(inspection.getSchedule()).willReturn(schedule);
        given(schedule.getEquipment()).willReturn(equipment);
        given(faultRepository.save(any(Fault.class))).willAnswer(inv -> inv.getArgument(0));

        FaultResponse resp = faultService.createFromInspectionResult(result, reporter);

        assertThat(resp.title()).startsWith("[점검이상]");
        assertThat(resp.title()).contains("오일 누유");
        assertThat(resp.severity()).isEqualTo(FaultSeverity.MEDIUM);
    }

    @Test
    @DisplayName("장애 상태 변경 — REPORTED → CONFIRMED 성공")
    void changeStatus_reportedToConfirmed_success() {
        Fault fault = Fault.builder()
            .equipment(equipment).title("테스트").severity(FaultSeverity.MEDIUM)
            .reportedBy(reporter).build();
        given(faultRepository.findById(1L)).willReturn(Optional.of(fault));
        given(userRepository.findById(2L)).willReturn(Optional.of(reporter));

        FaultStatusChangeRequest req = new FaultStatusChangeRequest(FaultStatus.CONFIRMED, "확인됨");
        FaultResponse resp = faultService.changeStatus(1L, req, 2L);

        assertThat(resp.status()).isEqualTo(FaultStatus.CONFIRMED);
    }

    @Test
    @DisplayName("유효하지 않은 상태 전이 — REPORTED → RESOLVED 시도 → IllegalStateException")
    void changeStatus_invalidTransition_throws() {
        Fault fault = Fault.builder()
            .equipment(equipment).title("테스트").severity(FaultSeverity.MEDIUM)
            .reportedBy(reporter).build();
        given(faultRepository.findById(1L)).willReturn(Optional.of(fault));
        given(userRepository.findById(2L)).willReturn(Optional.of(reporter));

        FaultStatusChangeRequest req = new FaultStatusChangeRequest(FaultStatus.RESOLVED, "바로 해결");

        assertThatThrownBy(() -> faultService.changeStatus(1L, req, 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("상태 전이 불가");
    }

    @Test
    @DisplayName("담당자 배정 성공")
    void assign_updatesAssignee() {
        Fault fault = Fault.builder()
            .equipment(equipment).title("테스트").severity(FaultSeverity.LOW)
            .reportedBy(reporter).build();
        User assignee = mock(User.class);
        given(assignee.getId()).willReturn(3L);
        given(assignee.getName()).willReturn("담당자");
        given(faultRepository.findById(1L)).willReturn(Optional.of(fault));
        given(userRepository.findById(3L)).willReturn(Optional.of(assignee));

        FaultResponse resp = faultService.assign(1L, new FaultAssignRequest(3L));

        assertThat(resp.assignedToName()).isEqualTo("담당자");
    }
}
