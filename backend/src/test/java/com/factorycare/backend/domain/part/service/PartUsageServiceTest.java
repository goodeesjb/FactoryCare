package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.part.dto.PartUsageCreateRequest;
import com.factorycare.backend.domain.part.dto.PartUsageResponse;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.PartUsage;
import com.factorycare.backend.domain.part.repository.PartRepository;
import com.factorycare.backend.domain.part.repository.PartUsageRepository;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class PartUsageServiceTest {

    @InjectMocks PartUsageService partUsageService;
    @Mock PartUsageRepository partUsageRepository;
    @Mock PartRepository partRepository;
    @Mock MaintenanceRepository maintenanceRepository;
    @Mock UserRepository userRepository;

    private MaintenanceTask buildInProgressTask() {
        Equipment eq = mock(Equipment.class);
        User creator = mock(User.class);

        MaintenanceTask task = MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(eq)
            .title("모터 수리").taskType(MaintenanceType.REPAIR)
            .createdBy(creator).build();
        task.start();
        return task;
    }

    private Part buildPart() {
        return Part.builder()
            .partNo("PT-2026-001").name("베어링A").manufacturer("한국부품")
            .stockQuantity(20).minimumStock(5).build();
    }

    private User buildWorker() {
        return mock(User.class);
    }

    @Test
    @DisplayName("부품 사용 등록 — 재고 감소")
    void create_success_stockDecreases() {
        MaintenanceTask inProgressTask = buildInProgressTask();
        Part part = buildPart();
        User worker = buildWorker();

        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(inProgressTask));
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));
        given(userRepository.findById(2L)).willReturn(Optional.of(worker));
        given(partUsageRepository.save(any(PartUsage.class))).willAnswer(inv -> inv.getArgument(0));

        partUsageService.create(1L, new PartUsageCreateRequest(1L, 3, "교체용"), 2L);

        assertThat(part.getStockQuantity()).isEqualTo(17); // 20 - 3
    }

    @Test
    @DisplayName("COMPLETED 작업에 부품 추가 → IllegalStateException")
    void create_completedTask_throws() {
        MaintenanceTask inProgressTask = buildInProgressTask();
        inProgressTask.complete();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(inProgressTask));

        assertThatThrownBy(() ->
            partUsageService.create(1L, new PartUsageCreateRequest(1L, 1, null), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("완료 또는 취소된 작업");
    }

    @Test
    @DisplayName("재고 부족 시 부품 사용 등록 → IllegalStateException")
    void create_insufficientStock_throws() {
        MaintenanceTask inProgressTask = buildInProgressTask();
        Part part = buildPart();
        User worker = buildWorker();

        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(inProgressTask));
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));
        given(userRepository.findById(2L)).willReturn(Optional.of(worker));

        assertThatThrownBy(() ->
            partUsageService.create(1L, new PartUsageCreateRequest(1L, 100, null), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("재고가 부족합니다");
    }

    @Test
    @DisplayName("부품 사용 삭제 — 재고 복원")
    void delete_success_stockRestored() {
        MaintenanceTask inProgressTask = mock(MaintenanceTask.class);
        given(inProgressTask.getId()).willReturn(1L);
        given(inProgressTask.getStatus()).willReturn(MaintenanceStatus.IN_PROGRESS);

        Part part = buildPart();
        User worker = mock(User.class);
        given(worker.getId()).willReturn(2L);

        PartUsage usage = mock(PartUsage.class);
        given(usage.getMaintenanceTask()).willReturn(inProgressTask);
        given(usage.getPart()).willReturn(part);
        given(usage.getQuantity()).willReturn(5);
        given(usage.getUsedBy()).willReturn(worker);
        given(partUsageRepository.findById(1L)).willReturn(Optional.of(usage));

        // 본인이 등록한 이력 삭제
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("worker", null,
                List.of(new SimpleGrantedAuthority("ROLE_WORKER"))));

        partUsageService.delete(1L, 1L, 2L);

        assertThat(part.getStockQuantity()).isEqualTo(25); // 20 + 5
        verify(partUsageRepository).delete(usage);

        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("다른 사람 이력을 WORKER 권한으로 삭제 시도 → AccessDeniedException")
    void delete_nonCreatorWorker_throws() {
        MaintenanceTask inProgressTask = mock(MaintenanceTask.class);
        given(inProgressTask.getId()).willReturn(1L);
        given(inProgressTask.getStatus()).willReturn(MaintenanceStatus.IN_PROGRESS);

        User otherUser = mock(User.class);
        given(otherUser.getId()).willReturn(99L);

        PartUsage usage = mock(PartUsage.class);
        given(usage.getMaintenanceTask()).willReturn(inProgressTask);
        given(usage.getUsedBy()).willReturn(otherUser); // 다른 사람이 등록
        given(partUsageRepository.findById(1L)).willReturn(Optional.of(usage));

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("worker", null,
                List.of(new SimpleGrantedAuthority("ROLE_WORKER"))));

        assertThatThrownBy(() -> partUsageService.delete(1L, 1L, 2L)) // callerId=2L, creator=99L
            .isInstanceOf(AccessDeniedException.class);

        SecurityContextHolder.clearContext();
    }
}
