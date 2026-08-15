package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import java.time.LocalDate;

public record FaultSearchCondition(
    Long equipmentId,
    FaultStatus status,
    FaultSeverity severity,
    Long assigneeId,
    LocalDate from,
    LocalDate to
) {}