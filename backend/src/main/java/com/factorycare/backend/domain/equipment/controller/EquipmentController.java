package com.factorycare.backend.domain.equipment.controller;

import com.factorycare.backend.domain.equipment.dto.*;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.service.EquipmentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/equipments")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping
    public ResponseEntity<Page<EquipmentResponse>> search(
            @RequestParam(required = false) String equipmentNo,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Long typeId,
            @RequestParam(required = false) EquipmentStatus status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Long assigneeId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        EquipmentSearchCondition condition = new EquipmentSearchCondition(equipmentNo, name, typeId, status, location, assigneeId);
        return ResponseEntity.ok(equipmentService.search(condition, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<EquipmentResponse> create(@Valid @RequestBody EquipmentCreateRequest request) {
        EquipmentResponse response = equipmentService.create(request);
        return ResponseEntity.created(URI.create("/api/equipments/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipmentResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(equipmentService.findById(id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<EquipmentResponse> update(@PathVariable Long id,
                                                     @RequestBody EquipmentUpdateRequest request) {
        return ResponseEntity.ok(equipmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        equipmentService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
