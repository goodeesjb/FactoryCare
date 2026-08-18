package com.factorycare.backend.domain.maintenance.dto;

import jakarta.validation.constraints.NotBlank;

public record MaintenanceStartRequest(@NotBlank String content) {}
