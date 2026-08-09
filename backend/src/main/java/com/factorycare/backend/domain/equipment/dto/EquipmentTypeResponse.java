package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;

public record EquipmentTypeResponse(Long id, String name, String description) {
    public static EquipmentTypeResponse from(EquipmentType type) {
        return new EquipmentTypeResponse(type.getId(), type.getName(), type.getDescription());
    }
}
