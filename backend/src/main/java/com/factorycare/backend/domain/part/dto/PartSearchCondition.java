package com.factorycare.backend.domain.part.dto;

import com.factorycare.backend.domain.part.entity.StockStatus;

public record PartSearchCondition(
    String keyword,
    String storageLocation,
    StockStatus stockStatus
) {}
