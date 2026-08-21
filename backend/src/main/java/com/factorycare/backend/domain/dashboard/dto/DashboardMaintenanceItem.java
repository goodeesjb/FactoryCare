package com.factorycare.backend.domain.dashboard.dto;

public record DashboardMaintenanceItem(
    Long id,
    String title,
    String taskNo,
    String equipmentName,
    String status,
    String scheduledDate
) {}
