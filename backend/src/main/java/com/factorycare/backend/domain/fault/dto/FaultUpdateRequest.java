package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultSeverity;

public record FaultUpdateRequest(String title, String description, FaultSeverity severity) {}
