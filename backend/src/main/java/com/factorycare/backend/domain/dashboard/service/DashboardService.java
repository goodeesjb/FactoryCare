package com.factorycare.backend.domain.dashboard.service;

import com.factorycare.backend.domain.dashboard.dto.*;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.Comparator;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final List<FaultStatus> UNRESOLVED_STATUSES =
        List.of(FaultStatus.REPORTED, FaultStatus.CONFIRMED, FaultStatus.IN_PROGRESS);

    private final EquipmentRepository equipmentRepository;
    private final FaultRepository faultRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final InspectionScheduleRepository inspectionScheduleRepository;

    public DashboardService(EquipmentRepository equipmentRepository,
                            FaultRepository faultRepository,
                            MaintenanceRepository maintenanceRepository,
                            InspectionScheduleRepository inspectionScheduleRepository) {
        this.equipmentRepository = equipmentRepository;
        this.faultRepository = faultRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.inspectionScheduleRepository = inspectionScheduleRepository;
    }

    public DashboardSummaryResponse getSummary(int period, String equipmentStatus) {
        return new DashboardSummaryResponse(
            buildKpi(period, equipmentStatus),
            buildFaultTrend(),
            buildEquipmentDistribution(),
            buildRecentFaults(),
            buildRecentMaintenance()
        );
    }

    private KpiResponse buildKpi(int period, String equipmentStatus) {
        long totalEquipments = "ALL".equals(equipmentStatus)
            ? equipmentRepository.countByActiveTrue()
            : equipmentRepository.countByStatusAndActiveTrue(EquipmentStatus.valueOf(equipmentStatus));

        long normalEquipments = equipmentRepository.countByStatusAndActiveTrue(EquipmentStatus.NORMAL);
        long brokenEquipments = equipmentRepository.countByStatusAndActiveTrue(EquipmentStatus.BROKEN);
        long pendingMaintenance = maintenanceRepository.countByStatus(MaintenanceStatus.PENDING);
        long unresolvedFaults = faultRepository.countByStatusIn(UNRESOLVED_STATUSES);

        LocalDate today = LocalDate.now();
        long scheduledInspections = inspectionScheduleRepository
            .countByScheduledDateBetweenAndStatus(today, today.plusDays(period), InspectionScheduleStatus.SCHEDULED);

        return new KpiResponse(totalEquipments, normalEquipments, brokenEquipments,
            pendingMaintenance, unresolvedFaults, scheduledInspections);
    }

    private List<FaultTrendItem> buildFaultTrend() {
        LocalDateTime sixMonthsAgo = YearMonth.now().minusMonths(5)
            .atDay(1).atStartOfDay();
        List<Object[]> rows = faultRepository.countByYearMonthSince(sixMonthsAgo);

        Map<String, Long> trendMap = rows.stream().collect(Collectors.toMap(
            row -> ((Number) row[0]).intValue() + "-" + String.format("%02d", ((Number) row[1]).intValue()),
            row -> ((Number) row[2]).longValue()
        ));

        List<FaultTrendItem> result = new ArrayList<>();
        YearMonth now = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            String key = ym.getYear() + "-" + String.format("%02d", ym.getMonthValue());
            result.add(new FaultTrendItem(ym.getMonthValue() + "월", trendMap.getOrDefault(key, 0L)));
        }
        return result;
    }

    private List<EquipmentStatusItem> buildEquipmentDistribution() {
        List<Object[]> rows = equipmentRepository.countGroupByStatus();
        Map<EquipmentStatus, Long> distMap = rows.stream().collect(Collectors.toMap(
            row -> (EquipmentStatus) row[0],
            row -> (Long) row[1]
        ));

        record StatusMeta(EquipmentStatus status, String label) {}
        List<StatusMeta> order = List.of(
            new StatusMeta(EquipmentStatus.NORMAL, "정상"),
            new StatusMeta(EquipmentStatus.INSPECTION_NEEDED, "점검필요"),
            new StatusMeta(EquipmentStatus.BROKEN, "고장"),
            new StatusMeta(EquipmentStatus.REPAIRING, "수리중"),
            new StatusMeta(EquipmentStatus.DISCARDED, "폐기")
        );

        return order.stream()
            .map(m -> new EquipmentStatusItem(m.status().name(), m.label(), distMap.getOrDefault(m.status(), 0L)))
            .toList();
    }

    private List<DashboardFaultItem> buildRecentFaults() {
        return faultRepository.findRecentWithEquipment(PageRequest.of(0, 10))
            .stream()
            .sorted(Comparator.comparingInt((Fault f) -> f.getSeverity().ordinal()).reversed()
                .thenComparing(Comparator.comparing(Fault::getCreatedAt).reversed()))
            .limit(5)
            .map(f -> new DashboardFaultItem(
                f.getId(),
                f.getTitle(),
                f.getEquipment().getName(),
                f.getSeverity().name(),
                f.getStatus().name(),
                f.getCreatedAt().toLocalDate().toString()
            ))
            .toList();
    }

    private List<DashboardMaintenanceItem> buildRecentMaintenance() {
        return maintenanceRepository.findRecentWithEquipment(PageRequest.of(0, 5))
            .stream()
            .map(m -> new DashboardMaintenanceItem(
                m.getId(),
                m.getTitle(),
                m.getTaskNo(),
                m.getEquipment().getName(),
                m.getStatus().name(),
                m.getScheduledDate() != null ? m.getScheduledDate().toString() : null
            ))
            .toList();
    }
}
