package com.factorycare.backend.domain.fault.controller;

import com.factorycare.backend.domain.fault.dto.*;
import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.service.FaultService;
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
@RequestMapping("/api/faults")
public class FaultController {

    private final FaultService service;

    public FaultController(FaultService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<FaultResponse>> search(
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) FaultStatus status,
            @RequestParam(required = false) FaultSeverity severity,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(service.search(
            new FaultSearchCondition(equipmentId, status, severity, assigneeId, from, to), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FaultResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<FaultResponse> create(
            @Valid @RequestBody FaultCreateRequest req,
            @AuthenticationPrincipal Long userId) {
        FaultResponse res = service.create(req, userId);
        return ResponseEntity.created(URI.create("/api/faults/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<FaultResponse> update(
            @PathVariable Long id,
            @RequestBody FaultUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<FaultResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody FaultStatusChangeRequest req,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(service.changeStatus(id, req, userId));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<FaultResponse> assign(
            @PathVariable Long id,
            @Valid @RequestBody FaultAssignRequest req) {
        return ResponseEntity.ok(service.assign(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
