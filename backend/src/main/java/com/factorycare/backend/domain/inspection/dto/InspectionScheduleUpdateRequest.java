package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionScheduleType;
import java.time.LocalDate;

public record InspectionScheduleUpdateRequest(
    Long assigneeId, LocalDate scheduledDate,
    InspectionScheduleType inspectionType, String description
) {}