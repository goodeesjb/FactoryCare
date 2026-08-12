package com.factorycare.backend.domain.inspection.controller;

import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.service.InspectionScheduleService;
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
@RequestMapping("/api/inspection-schedules")
public class InspectionScheduleController {

    private final InspectionScheduleService service;

    public InspectionScheduleController(InspectionScheduleService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<InspectionScheduleResponse>> search(
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) InspectionScheduleStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 10, sort = "scheduledDate", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(service.search(
            new InspectionScheduleSearchCondition(equipmentId, assigneeId, status, from, to), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionScheduleResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionScheduleResponse> create(
            @Valid @RequestBody InspectionScheduleCreateRequest req) {
        InspectionScheduleResponse res = service.create(req);
        return ResponseEntity.created(URI.create("/api/inspection-schedules/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionScheduleResponse> update(
            @PathVariable Long id, @RequestBody InspectionScheduleUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionResponse> start(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        InspectionResponse res = service.startInspection(id, userId);
        return ResponseEntity.created(URI.create("/api/inspections/" + res.id())).body(res);
    }
}