package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatusHistory;

import java.time.LocalDateTime;

public record EquipmentStatusHistoryResponse(
        Long id,
        EquipmentStatus previousStatus,
        EquipmentStatus newStatus,
        String reason,
        String changedByName,
        LocalDateTime changedAt
) {
    public static EquipmentStatusHistoryResponse from(EquipmentStatusHistory h) {
        return new EquipmentStatusHistoryResponse(
                h.getId(), h.getPreviousStatus(), h.getNewStatus(),
                h.getReason(), h.getChangedBy().getName(), h.getChangedAt()
        );
    }
}
