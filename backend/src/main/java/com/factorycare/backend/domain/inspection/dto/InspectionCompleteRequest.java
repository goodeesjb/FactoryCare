package com.factorycare.backend.domain.inspection.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record InspectionCompleteRequest(
    @NotEmpty List<InspectionResultRequest> results
) {}