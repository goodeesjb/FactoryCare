package com.factorycare.backend.domain.maintenance.dto;

import jakarta.validation.constraints.NotNull;

public record MaintenanceAssignRequest(@NotNull Long assigneeId) {}
