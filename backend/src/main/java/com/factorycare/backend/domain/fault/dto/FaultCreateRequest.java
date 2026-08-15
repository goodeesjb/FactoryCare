package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FaultCreateRequest(
    @NotNull Long equipmentId,
    @NotBlank String title,
    String description,
    FaultSeverity severity
) {}
