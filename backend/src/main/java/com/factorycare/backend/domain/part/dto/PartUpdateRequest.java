package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;

public record PartUpdateRequest(
    String name,
    String manufacturer,
    @Min(0) Integer minimumStock,
    String storageLocation,
    String description
) {}
