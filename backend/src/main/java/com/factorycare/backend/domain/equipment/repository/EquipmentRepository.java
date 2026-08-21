package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EquipmentRepository extends JpaRepository<Equipment, Long>, EquipmentRepositoryCustom {
    boolean existsByEquipmentNo(String equipmentNo);
    Optional<Equipment> findByIdAndActiveTrue(Long id);
    long countByActiveTrue();
    long countByStatusAndActiveTrue(EquipmentStatus status);
    @Query("SELECT e.status, COUNT(e) FROM Equipment e WHERE e.active = true GROUP BY e.status")
    List<Object[]> countGroupByStatus();
}
