package com.factorycare.backend.domain.part.controller;

import com.factorycare.backend.domain.part.dto.PartUsageCreateRequest;
import com.factorycare.backend.domain.part.dto.PartUsageResponse;
import com.factorycare.backend.domain.part.service.PartUsageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance/{maintenanceId}/parts")
public class PartUsageController {

    private final PartUsageService partUsageService;

    public PartUsageController(PartUsageService partUsageService) {
        this.partUsageService = partUsageService;
    }

    @GetMapping
    public ResponseEntity<List<PartUsageResponse>> getList(@PathVariable Long maintenanceId) {
        return ResponseEntity.ok(partUsageService.findByMaintenanceId(maintenanceId));
    }

    @PostMapping
    public ResponseEntity<PartUsageResponse> create(
            @PathVariable Long maintenanceId,
            @Valid @RequestBody PartUsageCreateRequest req,
            @AuthenticationPrincipal Long userId) {
        PartUsageResponse res = partUsageService.create(maintenanceId, req, userId);
        return ResponseEntity.created(
            URI.create("/api/maintenance/" + maintenanceId + "/parts/" + res.id()))
            .body(res);
    }

    @DeleteMapping("/{usageId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long maintenanceId,
            @PathVariable Long usageId) {
        partUsageService.delete(maintenanceId, usageId);
        return ResponseEntity.noContent().build();
    }
}
