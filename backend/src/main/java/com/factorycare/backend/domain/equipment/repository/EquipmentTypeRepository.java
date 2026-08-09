package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EquipmentTypeRepository extends JpaRepository<EquipmentType, Long> {
    boolean existsByName(String name);

    @Query("SELECT COUNT(e) > 0 FROM Equipment e WHERE e.type.id = :typeId AND e.active = true")
    boolean isUsedByEquipment(@Param("typeId") Long typeId);
}
