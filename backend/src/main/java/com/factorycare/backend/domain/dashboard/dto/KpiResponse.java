package com.factorycare.backend.domain.dashboard.dto;

public record KpiResponse(
    long totalEquipments,
    long normalEquipments,
    long brokenEquipments,
    long pendingMaintenance,
    long unresolvedFaults,
    long scheduledInspections
) {}
