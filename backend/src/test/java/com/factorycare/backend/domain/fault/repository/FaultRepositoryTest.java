package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.dto.FaultSearchCondition;
import com.factorycare.backend.domain.fault.entity.*;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class FaultRepositoryTest {

    @Autowired FaultRepository faultRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired UserRepository userRepository;

    Equipment eq1, eq2;
    User reporter;

    @BeforeEach
    void setUp() {
        eq1 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());
        eq2 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("로봇팔").build());
        reporter = userRepository.save(User.builder()
            .loginId("worker01").password("pw").name("작업자").role(UserRole.WORKER).build());
    }

    private Fault saveFault(Equipment eq, String title, FaultSeverity severity, FaultStatus status) {
        Fault f = Fault.builder()
            .equipment(eq).title(title).severity(severity).reportedBy(reporter).build();
        Fault saved = faultRepository.save(f);
        if (status != FaultStatus.REPORTED) {
            // 상태 전이: REPORTED → CONFIRMED → ... 순서로 변경
            saved.changeStatus(FaultStatus.CONFIRMED);
            if (status == FaultStatus.IN_PROGRESS || status == FaultStatus.RESOLVED) {
                saved.changeStatus(FaultStatus.IN_PROGRESS);
            }
            if (status == FaultStatus.RESOLVED) {
                saved.changeStatus(FaultStatus.RESOLVED);
            }
        }
        return saved;
    }

    @Test
    @DisplayName("status 필터 — REPORTED만 조회")
    void search_byStatus() {
        saveFault(eq1, "장애A", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "장애B", FaultSeverity.LOW, FaultStatus.CONFIRMED);

        FaultSearchCondition cond = new FaultSearchCondition(null, FaultStatus.REPORTED, null, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("장애A");
    }

    @Test
    @DisplayName("severity 필터 — HIGH만 조회")
    void search_bySeverity() {
        saveFault(eq1, "고심각", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "저심각", FaultSeverity.LOW, FaultStatus.REPORTED);

        FaultSearchCondition cond = new FaultSearchCondition(null, null, FaultSeverity.HIGH, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSeverity()).isEqualTo(FaultSeverity.HIGH);
    }

    @Test
    @DisplayName("equipmentId 필터 — eq1만 조회")
    void search_byEquipmentId() {
        saveFault(eq1, "eq1장애", FaultSeverity.MEDIUM, FaultStatus.REPORTED);
        saveFault(eq2, "eq2장애", FaultSeverity.MEDIUM, FaultStatus.REPORTED);

        FaultSearchCondition cond = new FaultSearchCondition(eq1.getId(), null, null, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEquipment().getId()).isEqualTo(eq1.getId());
    }

    @Test
    @DisplayName("조건 없음 — 전체 조회")
    void search_noCondition_all() {
        saveFault(eq1, "장애1", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "장애2", FaultSeverity.LOW, FaultStatus.REPORTED);

        FaultSearchCondition cond = new FaultSearchCondition(null, null, null, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("countByStatusIn — REPORTED + CONFIRMED 합산")
    void countByStatusIn() {
        saveFault(eq1, "A", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "B", FaultSeverity.LOW, FaultStatus.CONFIRMED);
        saveFault(eq1, "C", FaultSeverity.MEDIUM, FaultStatus.RESOLVED);

        long count = faultRepository.countByStatusIn(List.of(FaultStatus.REPORTED, FaultStatus.CONFIRMED));

        assertThat(count).isEqualTo(2);
    }
}
