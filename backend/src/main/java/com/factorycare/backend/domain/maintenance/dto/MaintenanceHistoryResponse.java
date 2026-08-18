package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceHistory;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceHistoryType;
import java.time.LocalDateTime;

public record MaintenanceHistoryResponse(
    Long id,
    MaintenanceHistoryType type,
    String recordedByName,
    String content,
    Integer durationMinutes,
    LocalDateTime recordedAt
) {
    public static MaintenanceHistoryResponse from(MaintenanceHistory h) {
        return new MaintenanceHistoryResponse(
            h.getId(), h.getType(), h.getRecordedBy().getName(),
            h.getContent(), h.getDurationMinutes(), h.getRecordedAt()
        );
    }
}
