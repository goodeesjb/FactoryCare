package com.factorycare.backend.domain.maintenance.controller;

import com.factorycare.backend.domain.maintenance.dto.*;
import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.service.MaintenanceService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    private final MaintenanceService service;

    public MaintenanceController(MaintenanceService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<MaintenanceResponse>> search(
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) MaintenanceStatus status,
            @RequestParam(required = false) MaintenancePriority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long faultId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(service.search(
            new MaintenanceSearchCondition(equipmentId, status, priority, assigneeId, faultId, from, to), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> create(
            @Valid @RequestBody MaintenanceCreateRequest req,
            @AuthenticationPrincipal Long userId) {
        MaintenanceResponse res = service.create(req, userId);
        return ResponseEntity.created(URI.create("/api/maintenance/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> update(
            @PathVariable Long id,
            @RequestBody MaintenanceUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> assign(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceAssignRequest req) {
        return ResponseEntity.ok(service.assign(id, req));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<MaintenanceResponse> start(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceStartRequest req,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(service.start(id, req, userId));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<MaintenanceResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceCompleteRequest req,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(service.complete(id, req, userId));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(service.cancel(id));
    }
}
