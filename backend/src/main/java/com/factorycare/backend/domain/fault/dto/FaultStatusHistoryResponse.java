package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.entity.FaultStatusHistory;
import java.time.LocalDateTime;

public record FaultStatusHistoryResponse(
    Long id,
    FaultStatus fromStatus,
    FaultStatus toStatus,
    String changedByName,
    String reason,
    LocalDateTime changedAt
) {
    public static FaultStatusHistoryResponse from(FaultStatusHistory h) {
        return new FaultStatusHistoryResponse(
            h.getId(), h.getFromStatus(), h.getToStatus(),
            h.getChangedBy().getName(), h.getReason(), h.getChangedAt()
        );
    }
}
