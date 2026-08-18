package com.factorycare.backend.domain.maintenance.dto;

import jakarta.validation.constraints.NotBlank;

public record MaintenanceCompleteRequest(
    @NotBlank String content,
    Integer durationMinutes
) {}
