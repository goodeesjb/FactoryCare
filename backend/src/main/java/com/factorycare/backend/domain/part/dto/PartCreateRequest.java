package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PartCreateRequest(
    @NotBlank String name,
    String manufacturer,
    @NotNull @Min(0) Integer stockQuantity,
    @Min(0) int minimumStock,
    String storageLocation,
    String description
) {}
