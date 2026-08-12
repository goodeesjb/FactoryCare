package com.factorycare.backend.domain.inspection.controller;

import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.service.InspectionChecklistService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/inspection-checklists")
public class InspectionChecklistController {

    private final InspectionChecklistService service;

    public InspectionChecklistController(InspectionChecklistService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<InspectionChecklistResponse>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionChecklistResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionChecklistResponse> create(
            @Valid @RequestBody InspectionChecklistCreateRequest req) {
        InspectionChecklistResponse res = service.create(req);
        return ResponseEntity.created(URI.create("/api/inspection-checklists/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionChecklistResponse> update(
            @PathVariable Long id,
            @RequestBody InspectionChecklistUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}