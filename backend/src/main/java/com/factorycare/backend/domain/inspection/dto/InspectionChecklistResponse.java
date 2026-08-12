package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import java.time.LocalDateTime;
import java.util.List;

public record InspectionChecklistResponse(
    Long id, String name, String description,
    String equipmentTypeName,
    List<InspectionChecklistItemResponse> items,
    LocalDateTime createdAt
) {
    public static InspectionChecklistResponse from(InspectionChecklist cl) {
        return new InspectionChecklistResponse(
            cl.getId(), cl.getName(), cl.getDescription(),
            cl.getEquipmentType() != null ? cl.getEquipmentType().getName() : null,
            cl.getItems().stream().map(InspectionChecklistItemResponse::from).toList(),
            cl.getCreatedAt()
        );
    }
}