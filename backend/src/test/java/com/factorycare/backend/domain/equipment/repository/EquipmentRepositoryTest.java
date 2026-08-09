package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.dto.EquipmentSearchCondition;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.global.config.JpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class EquipmentRepositoryTest {

    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired UserRepository userRepository;

    private User savedUser() {
        return userRepository.save(User.builder()
                .loginId("worker01").password("pw").name("작업자").role(UserRole.WORKER).build());
    }

    private EquipmentType savedType(String name) {
        return equipmentTypeRepository.save(EquipmentType.builder().name(name).build());
    }

    @Test
    @DisplayName("설비번호 부분검색")
    void searchByEquipmentNo() {
        EquipmentType type = savedType("로봇암");
        User user = savedUser();
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(user).build());
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("컨베이어B").type(type).assignee(user).build());

        EquipmentSearchCondition cond = new EquipmentSearchCondition("EQ-001", null, null, null, null, null);
        Page<Equipment> result = equipmentRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEquipmentNo()).isEqualTo("EQ-001");
    }

    @Test
    @DisplayName("상태 필터 검색")
    void searchByStatus() {
        EquipmentType type = savedType("컨베이어");
        User user = savedUser();
        Equipment eq1 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("설비A").type(type).assignee(user).build());
        Equipment eq2 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("설비B").type(type).assignee(user).build());
        eq1.changeStatus(EquipmentStatus.BROKEN);

        EquipmentSearchCondition cond = new EquipmentSearchCondition(null, null, null, EquipmentStatus.BROKEN, null, null);
        Page<Equipment> result = equipmentRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEquipmentNo()).isEqualTo("EQ-001");
    }

    @Test
    @DisplayName("Soft delete된 설비는 검색에서 제외")
    void softDeleted_notInSearch() {
        EquipmentType type = savedType("로봇암");
        User user = savedUser();
        Equipment eq = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("설비A").type(type).assignee(user).build());
        eq.deactivate();

        Page<Equipment> result = equipmentRepository.search(new EquipmentSearchCondition(null, null, null, null, null, null), PageRequest.of(0, 10));

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("페이징 동작 확인")
    void paging() {
        EquipmentType type = savedType("로봇암");
        User user = savedUser();
        for (int i = 1; i <= 5; i++) {
            equipmentRepository.save(Equipment.builder()
                    .equipmentNo("EQ-00" + i).name("설비" + i).type(type).assignee(user).build());
        }

        Page<Equipment> page0 = equipmentRepository.search(
                new EquipmentSearchCondition(null, null, null, null, null, null),
                PageRequest.of(0, 3));

        assertThat(page0.getContent()).hasSize(3);
        assertThat(page0.getTotalElements()).isEqualTo(5);
        assertThat(page0.getTotalPages()).isEqualTo(2);
    }
}
