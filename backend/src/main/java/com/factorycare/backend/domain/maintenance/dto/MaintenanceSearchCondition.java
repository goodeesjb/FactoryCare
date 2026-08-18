package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import java.time.LocalDate;

public record MaintenanceSearchCondition(
    Long equipmentId,
    MaintenanceStatus status,
    MaintenancePriority priority,
    Long assigneeId,
    Long faultId,
    LocalDate from,
    LocalDate to
) {}
