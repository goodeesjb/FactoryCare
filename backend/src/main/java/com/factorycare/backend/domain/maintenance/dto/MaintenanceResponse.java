package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MaintenanceResponse(
    Long id,
    String taskNo,
    Long equipmentId, String equipmentName,
    Long faultId,
    String title, String description,
    MaintenanceType taskType,
    MaintenancePriority priority,
    Long assigneeId, String assigneeName,
    LocalDate scheduledDate,
    MaintenanceStatus status,
    String createdByName,
    LocalDateTime completedAt,
    List<MaintenanceHistoryResponse> histories,
    LocalDateTime createdAt
) {
    public static MaintenanceResponse from(MaintenanceTask m) {
        return new MaintenanceResponse(
            m.getId(), m.getTaskNo(),
            m.getEquipment().getId(), m.getEquipment().getName(),
            m.getFault() != null ? m.getFault().getId() : null,
            m.getTitle(), m.getDescription(),
            m.getTaskType(), m.getPriority(),
            m.getAssignee() != null ? m.getAssignee().getId() : null,
            m.getAssignee() != null ? m.getAssignee().getName() : null,
            m.getScheduledDate(), m.getStatus(),
            m.getCreatedBy().getName(),
            m.getCompletedAt(),
            m.getHistories().stream().map(MaintenanceHistoryResponse::from).toList(),
            m.getCreatedAt()
        );
    }
}
