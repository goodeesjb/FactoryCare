package com.factorycare.backend.domain.maintenance.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.maintenance.dto.*;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @InjectMocks MaintenanceService maintenanceService;
    @Mock(lenient = true) MaintenanceRepository maintenanceRepository;
    @Mock(lenient = true) EquipmentRepository equipmentRepository;
    @Mock(lenient = true) UserRepository userRepository;
    @Mock(lenient = true) FaultRepository faultRepository;

    Equipment equipment;
    User creator;
    MaintenanceTask pendingTask;

    @BeforeEach
    void setUp() {
        equipment = mock(Equipment.class);
        lenient().when(equipment.getId()).thenReturn(1L);
        lenient().when(equipment.getName()).thenReturn("컨베이어");

        creator = mock(User.class);
        lenient().when(creator.getId()).thenReturn(2L);
        lenient().when(creator.getName()).thenReturn("매니저");

        pendingTask = MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment)
            .title("모터 수리").taskType(MaintenanceType.REPAIR)
            .createdBy(creator).build();
    }

    @Test
    @DisplayName("작업 생성 — taskNo MT-YYYY-NNN 형식")
    void create_taskNoFormat() {
        MaintenanceCreateRequest req = new MaintenanceCreateRequest(
            1L, null, "모터 수리", null, MaintenanceType.REPAIR, null, null, null);
        given(equipmentRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(equipment));
        given(userRepository.findById(2L)).willReturn(Optional.of(creator));
        given(maintenanceRepository.countByCreatedAtBetween(any(), any())).willReturn(0L);
        given(maintenanceRepository.save(any(MaintenanceTask.class))).willAnswer(inv -> inv.getArgument(0));

        MaintenanceResponse resp = maintenanceService.create(req, 2L);

        assertThat(resp.taskNo()).startsWith("MT-");
        assertThat(resp.status()).isEqualTo(MaintenanceStatus.PENDING);
        assertThat(resp.priority()).isEqualTo(MaintenancePriority.MEDIUM);
    }

    @Test
    @DisplayName("PENDING → start → IN_PROGRESS + START 이력 1건")
    void start_fromPending_success() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));
        given(userRepository.findById(2L)).willReturn(Optional.of(creator));

        MaintenanceStartRequest req = new MaintenanceStartRequest("작업 시작");
        MaintenanceResponse resp = maintenanceService.start(1L, req, 2L);

        assertThat(resp.status()).isEqualTo(MaintenanceStatus.IN_PROGRESS);
        assertThat(resp.histories()).hasSize(1);
        assertThat(resp.histories().get(0).type()).isEqualTo(MaintenanceHistoryType.START);
    }

    @Test
    @DisplayName("PENDING이 아닌 상태에서 start 시도 → IllegalStateException")
    void start_fromNonPending_throws() {
        // start() 를 한 번 호출해서 IN_PROGRESS 상태로 만든 후 다시 start
        pendingTask.start();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.start(1L, new MaintenanceStartRequest("재시작"), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("PENDING 상태에서만 시작할 수 있습니다");
    }

    @Test
    @DisplayName("IN_PROGRESS → complete → COMPLETED + COMPLETE 이력 1건 + completedAt")
    void complete_fromInProgress_success() {
        pendingTask.start();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));
        given(userRepository.findById(2L)).willReturn(Optional.of(creator));

        MaintenanceCompleteRequest req = new MaintenanceCompleteRequest("수리 완료", 90);
        MaintenanceResponse resp = maintenanceService.complete(1L, req, 2L);

        assertThat(resp.status()).isEqualTo(MaintenanceStatus.COMPLETED);
        assertThat(resp.completedAt()).isNotNull();
        assertThat(resp.histories()).hasSize(1); // COMPLETE
        assertThat(resp.histories().get(0).type()).isEqualTo(MaintenanceHistoryType.COMPLETE);
        assertThat(resp.histories().get(0).durationMinutes()).isEqualTo(90);
    }

    @Test
    @DisplayName("PENDING 상태에서 complete 직접 시도 → IllegalStateException")
    void complete_fromPending_throws() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.complete(1L, new MaintenanceCompleteRequest("완료", 10), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("IN_PROGRESS 상태에서만 완료");
    }

    @Test
    @DisplayName("IN_PROGRESS → cancel → CANCELLED")
    void cancel_fromInProgress_success() {
        pendingTask.start();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        MaintenanceResponse resp = maintenanceService.cancel(1L);

        assertThat(resp.status()).isEqualTo(MaintenanceStatus.CANCELLED);
    }

    @Test
    @DisplayName("COMPLETED 작업 취소 시도 → IllegalStateException")
    void cancel_fromCompleted_throws() {
        pendingTask.start();
        pendingTask.complete();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.cancel(1L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("완료된 작업은 취소할 수 없습니다");
    }

    @Test
    @DisplayName("PENDING 작업 삭제 성공")
    void delete_pending_success() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatNoException().isThrownBy(() -> maintenanceService.delete(1L));
        verify(maintenanceRepository).delete(pendingTask);
    }

    @Test
    @DisplayName("COMPLETED 작업 삭제 시도 → IllegalStateException")
    void delete_completed_throws() {
        pendingTask.start();
        pendingTask.complete();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.delete(1L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("완료된 작업은 삭제할 수 없습니다");
        verify(maintenanceRepository, never()).delete(any());
    }
}
