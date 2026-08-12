package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.inspection.entity.InspectionResultValue;

public record InspectionResultResponse(
    Long id, Long checklistItemId, String itemName,
    InspectionResultValue result, String note, boolean needsFaultReport
) {
    public static InspectionResultResponse from(InspectionResult r) {
        return new InspectionResultResponse(
            r.getId(), r.getChecklistItem().getId(), r.getItemName(),
            r.getResult(), r.getNote(), r.isNeedsFaultReport()
        );
    }
}
