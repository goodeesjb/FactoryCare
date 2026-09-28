package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.maintenance.dto.MaintenanceSearchCondition;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.global.config.JpaConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class MaintenanceRepositoryTest {

    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired UserRepository userRepository;

    Equipment equipment;
    User creator, assignee;

    @BeforeEach
    void setUp() {
        equipment = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());
        creator = userRepository.save(User.builder()
            .loginId("manager01").password("pw").name("매니저").role(UserRole.MANAGER).build());
        assignee = userRepository.save(User.builder()
            .loginId("worker01").password("pw").name("작업자").role(UserRole.WORKER).build());
    }

    private MaintenanceTask saveTask(String taskNo, MaintenanceStatus status, User assignedTo) {
        MaintenanceTask task = MaintenanceTask.builder()
            .taskNo(taskNo).equipment(equipment)
            .title("작업 " + taskNo).taskType(MaintenanceType.REPAIR)
            .assignee(assignedTo).createdBy(creator).build();
        MaintenanceTask saved = maintenanceRepository.save(task);
        if (status == MaintenanceStatus.IN_PROGRESS || status == MaintenanceStatus.COMPLETED) {
            saved.start();
        }
        if (status == MaintenanceStatus.COMPLETED) {
            saved.complete();
        }
        return saved;
    }

    @Test
    @DisplayName("status 필터 — PENDING만 조회")
    void search_byStatus() {
        saveTask("MT-2026-001", MaintenanceStatus.PENDING, null);
        saveTask("MT-2026-002", MaintenanceStatus.IN_PROGRESS, assignee);

        MaintenanceSearchCondition cond = new MaintenanceSearchCondition(null, MaintenanceStatus.PENDING, null, null, null, null, null);
        Page<MaintenanceTask> result = maintenanceRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTaskNo()).isEqualTo("MT-2026-001");
    }

    @Test
    @DisplayName("assigneeId 필터 — 특정 담당자 작업만 조회")
    void search_byAssigneeId() {
        saveTask("MT-2026-001", MaintenanceStatus.PENDING, assignee);
        saveTask("MT-2026-002", MaintenanceStatus.PENDING, null);

        MaintenanceSearchCondition cond = new MaintenanceSearchCondition(null, null, null, assignee.getId(), null, null, null);
        Page<MaintenanceTask> result = maintenanceRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAssignee().getId()).isEqualTo(assignee.getId());
    }

    @Test
    @DisplayName("조건 없음 — 전체 조회 + 페이징")
    void search_noCondition_paging() {
        for (int i = 1; i <= 5; i++) {
            saveTask("MT-2026-00" + i, MaintenanceStatus.PENDING, null);
        }

        MaintenanceSearchCondition cond = new MaintenanceSearchCondition(null, null, null, null, null, null, null);
        Page<MaintenanceTask> page = maintenanceRepository.search(cond, PageRequest.of(0, 3));

        assertThat(page.getContent()).hasSize(3);
        assertThat(page.getTotalElements()).isEqualTo(5);
    }

    @Test
    @DisplayName("countByCreatedAtBetween — 올해 생성된 작업 수")
    void countByCreatedAtBetween() {
        saveTask("MT-2026-001", MaintenanceStatus.PENDING, null);
        saveTask("MT-2026-002", MaintenanceStatus.PENDING, null);

        int year = LocalDate.now().getYear();
        long count = maintenanceRepository.countByCreatedAtBetween(
            LocalDate.of(year, 1, 1).atStartOfDay(),
            LocalDate.of(year + 1, 1, 1).atStartOfDay());

        assertThat(count).isEqualTo(2);
    }
}
