package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.Inspection;
import com.factorycare.backend.domain.inspection.entity.InspectionStatus;
import java.time.LocalDateTime;
import java.util.List;

public record InspectionResponse(
    Long id, Long scheduleId,
    Long inspectorId, String inspectorName,
    InspectionStatus status,
    boolean hasAbnormality,
    LocalDateTime completedAt,
    List<InspectionResultResponse> results,
    LocalDateTime createdAt
) {
    public static InspectionResponse from(Inspection i, List<InspectionResultResponse> results) {
        return new InspectionResponse(
            i.getId(), i.getSchedule().getId(),
            i.getInspector().getId(), i.getInspector().getName(),
            i.getStatus(), i.isHasAbnormality(),
            i.getCompletedAt(), results, i.getCreatedAt()
        );
    }

    public static InspectionResponse from(Inspection i) {
        return from(i, List.of());
    }
}
