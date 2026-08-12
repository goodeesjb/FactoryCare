package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionResultValue;
import jakarta.validation.constraints.NotNull;

public record InspectionResultRequest(
    @NotNull Long checklistItemId,
    @NotNull InspectionResultValue result,
    String note
) {}
