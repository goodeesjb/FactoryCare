package com.factorycare.backend.domain.part.dto;

import com.factorycare.backend.domain.part.entity.PartUsage;
import java.time.LocalDateTime;

public record PartUsageResponse(
    Long id,
    Long partId,
    String partName,
    String partNo,
    Long maintenanceTaskId,
    String maintenanceTaskNo,
    int quantity,
    String note,
    String usedByName,
    LocalDateTime usedAt
) {
    public static PartUsageResponse from(PartUsage u) {
        return new PartUsageResponse(
            u.getId(),
            u.getPart().getId(),
            u.getPart().getName(),
            u.getPart().getPartNo(),
            u.getMaintenanceTask().getId(),
            u.getMaintenanceTask().getTaskNo(),
            u.getQuantity(),
            u.getNote(),
            u.getUsedBy().getName(),
            u.getUsedAt()
        );
    }
}
