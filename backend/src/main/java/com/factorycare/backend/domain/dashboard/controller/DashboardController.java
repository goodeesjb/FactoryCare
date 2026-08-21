package com.factorycare.backend.domain.dashboard.controller;

import com.factorycare.backend.domain.dashboard.dto.DashboardSummaryResponse;
import com.factorycare.backend.domain.dashboard.service.DashboardService;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getSummary(
            @RequestParam(defaultValue = "30") int period,
            @RequestParam(defaultValue = "ALL") String equipmentStatus) {
        if (period < 1 || period > 365) {
            return ResponseEntity.badRequest().build();
        }
        if (!"ALL".equals(equipmentStatus)) {
            try {
                EquipmentStatus.valueOf(equipmentStatus);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        return ResponseEntity.ok(service.getSummary(period, equipmentStatus));
    }
}
