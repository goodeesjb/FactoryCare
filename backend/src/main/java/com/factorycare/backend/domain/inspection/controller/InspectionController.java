package com.factorycare.backend.domain.inspection.controller;

import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.service.InspectionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspections")
public class InspectionController {

    private final InspectionService service;

    public InspectionController(InspectionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<InspectionResponse>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<InspectionResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody InspectionCompleteRequest req) {
        return ResponseEntity.ok(service.complete(id, req));
    }
}