package com.factorycare.backend.domain.equipment.dto;

import jakarta.validation.constraints.NotBlank;

public record EquipmentTypeCreateRequest(
        @NotBlank(message = "유형명은 필수입니다.") String name,
        String description
) {}
