package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import java.time.LocalDateTime;
import java.util.List;

public record FaultResponse(
    Long id,
    Long equipmentId, String equipmentName,
    String title, String description,
    FaultSeverity severity,
    FaultStatus status,
    Long reportedById, String reportedByName,
    Long assignedToId, String assignedToName,
    Long inspectionResultId,
    LocalDateTime resolvedAt,
    List<FaultStatusHistoryResponse> statusHistories,
    LocalDateTime createdAt
) {
    public static FaultResponse from(Fault f) {
        return new FaultResponse(
            f.getId(),
            f.getEquipment().getId(), f.getEquipment().getName(),
            f.getTitle(), f.getDescription(),
            f.getSeverity(), f.getStatus(),
            f.getReportedBy().getId(), f.getReportedBy().getName(),
            f.getAssignedTo() != null ? f.getAssignedTo().getId() : null,
            f.getAssignedTo() != null ? f.getAssignedTo().getName() : null,
            f.getInspectionResult() != null ? f.getInspectionResult().getId() : null,
            f.getResolvedAt(),
            f.getStatusHistories().stream().map(FaultStatusHistoryResponse::from).toList(),
            f.getCreatedAt()
        );
    }
}
