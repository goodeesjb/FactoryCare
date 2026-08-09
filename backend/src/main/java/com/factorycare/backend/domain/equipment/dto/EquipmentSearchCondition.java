package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;

public record EquipmentSearchCondition(
        String equipmentNo,
        String name,
        Long typeId,
        EquipmentStatus status,
        String location,
        Long assigneeId
) {}
