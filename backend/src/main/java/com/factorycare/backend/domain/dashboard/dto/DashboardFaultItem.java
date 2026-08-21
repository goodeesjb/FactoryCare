package com.factorycare.backend.domain.dashboard.dto;

public record DashboardFaultItem(
    Long id,
    String title,
    String equipmentName,
    String severity,
    String status,
    String reportedAt
) {}
