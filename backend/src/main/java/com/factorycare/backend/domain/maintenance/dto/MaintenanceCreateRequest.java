package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record MaintenanceCreateRequest(
    @NotNull Long equipmentId,
    Long faultId,
    @NotBlank String title,
    String description,
    @NotNull MaintenanceType taskType,
    MaintenancePriority priority,
    Long assigneeId,
    LocalDate scheduledDate
) {}
