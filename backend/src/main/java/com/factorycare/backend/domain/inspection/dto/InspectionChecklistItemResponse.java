package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklistItem;

public record InspectionChecklistItemResponse(Long id, String itemName, int itemOrder) {
    public static InspectionChecklistItemResponse from(InspectionChecklistItem item) {
        return new InspectionChecklistItemResponse(item.getId(), item.getItemName(), item.getItemOrder());
    }
}
