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
    public static InspectionResponse from(Inspection i) {
        return new InspectionResponse(
            i.getId(), i.getSchedule().getId(),
            i.getInspector().getId(), i.getInspector().getName(),
            i.getStatus(), i.isHasAbnormality(),
            i.getCompletedAt(), List.of(), i.getCreatedAt()
        );
    }
}