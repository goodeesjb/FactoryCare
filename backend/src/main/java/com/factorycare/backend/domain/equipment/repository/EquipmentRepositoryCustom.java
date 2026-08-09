package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.dto.EquipmentSearchCondition;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EquipmentRepositoryCustom {
    Page<Equipment> search(EquipmentSearchCondition condition, Pageable pageable);
}
