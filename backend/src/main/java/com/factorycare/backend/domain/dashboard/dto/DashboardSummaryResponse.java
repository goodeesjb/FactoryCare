package com.factorycare.backend.domain.dashboard.dto;

import java.util.List;

public record DashboardSummaryResponse(
    KpiResponse kpi,
    List<FaultTrendItem> faultTrend,
    List<EquipmentStatusItem> equipmentStatusDistribution,
    List<DashboardFaultItem> recentFaults,
    List<DashboardMaintenanceItem> recentMaintenance
) {}
