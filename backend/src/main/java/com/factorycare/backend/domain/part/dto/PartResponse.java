package com.factorycare.backend.domain.part.dto;

import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.StockStatus;
import java.time.LocalDateTime;

public record PartResponse(
    Long id,
    String partNo,
    String name,
    String manufacturer,
    int stockQuantity,
    int minimumStock,
    String storageLocation,
    String description,
    StockStatus stockStatus,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static PartResponse from(Part p) {
        return new PartResponse(
            p.getId(), p.getPartNo(), p.getName(), p.getManufacturer(),
            p.getStockQuantity(), p.getMinimumStock(), p.getStorageLocation(),
            p.getDescription(), p.getStockStatus(), p.isActive(),
            p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
