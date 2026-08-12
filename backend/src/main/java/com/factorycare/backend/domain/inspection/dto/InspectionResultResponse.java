package com.factorycare.backend.domain.inspection.dto;

public record InspectionResultResponse(
    Long id, Long checklistItemId, String itemName,
    String result, String note, boolean needsFaultReport
) {}