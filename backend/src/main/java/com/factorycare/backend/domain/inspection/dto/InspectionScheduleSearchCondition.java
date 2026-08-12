package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import java.time.LocalDate;

public record InspectionScheduleSearchCondition(
    Long equipmentId, Long assigneeId,
    InspectionScheduleStatus status,
    LocalDate from, LocalDate to
) {}