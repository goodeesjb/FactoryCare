package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionScheduleType;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record InspectionScheduleCreateRequest(
    @NotNull Long equipmentId,
    @NotNull Long checklistId,
    @NotNull Long assigneeId,
    @NotNull LocalDate scheduledDate,
    InspectionScheduleType inspectionType,
    String description
) {}