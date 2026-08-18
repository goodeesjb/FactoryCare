package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import java.time.LocalDate;

public record MaintenanceUpdateRequest(
    String title, String description,
    MaintenanceType taskType, MaintenancePriority priority,
    LocalDate scheduledDate
) {}
