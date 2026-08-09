package com.factorycare.backend.domain.equipment.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record EquipmentCreateRequest(
        @NotBlank(message = "설비번호는 필수입니다.") String equipmentNo,
        @NotBlank(message = "설비명은 필수입니다.") String name,
        Long typeId,
        String manufacturer,
        String modelName,
        LocalDate installedAt,
        String location,
        String department,
        Long assigneeId,
        String description
) {}
