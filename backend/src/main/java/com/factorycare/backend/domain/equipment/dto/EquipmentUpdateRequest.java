package com.factorycare.backend.domain.equipment.dto;

import java.time.LocalDate;

public record EquipmentUpdateRequest(
        String name,
        Long typeId,
        String manufacturer,
        String modelName,
        LocalDate installedAt,
        String location,
        String department,
        Long assigneeId,
        String description
) {}
