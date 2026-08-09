package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EquipmentTypeRepository extends JpaRepository<EquipmentType, Long> {
    boolean existsByName(String name);

    // TODO(Task 3): Equipment 엔티티 생성 후 실제 JPQL 쿼리로 교체
    // @Query("SELECT COUNT(e) > 0 FROM Equipment e WHERE e.type.id = :typeId AND e.active = true")
    default boolean isUsedByEquipment(@Param("typeId") Long typeId) {
        return false;
    }
}
