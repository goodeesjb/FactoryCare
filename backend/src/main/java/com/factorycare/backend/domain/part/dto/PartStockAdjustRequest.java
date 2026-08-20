package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PartStockAdjustRequest(@NotNull @Min(0) Integer newQuantity) {}
