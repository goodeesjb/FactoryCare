package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.user.dto.UserResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EquipmentResponse(
        Long id,
        String equipmentNo,
        String name,
        EquipmentTypeResponse type,
        String manufacturer,
        String modelName,
        LocalDate installedAt,
        String location,
        String department,
        UserResponse assignee,
        EquipmentStatus status,
        String description,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static EquipmentResponse from(Equipment e) {
        return new EquipmentResponse(
                e.getId(), e.getEquipmentNo(), e.getName(),
                e.getType() != null ? EquipmentTypeResponse.from(e.getType()) : null,
                e.getManufacturer(), e.getModelName(), e.getInstalledAt(),
                e.getLocation(), e.getDepartment(),
                e.getAssignee() != null ? UserResponse.from(e.getAssignee()) : null,
                e.getStatus(), e.getDescription(), e.isActive(),
                e.getCreatedAt(), e.getUpdatedAt()
        );
    }
}
