package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EquipmentRepository extends JpaRepository<Equipment, Long>, EquipmentRepositoryCustom {
    boolean existsByEquipmentNo(String equipmentNo);
    Optional<Equipment> findByIdAndActiveTrue(Long id);
}
