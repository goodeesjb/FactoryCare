package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PartUsageCreateRequest(
    @NotNull Long partId,
    @NotNull @Min(1) Integer quantity,
    String note
) {}
