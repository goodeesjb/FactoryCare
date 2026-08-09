package com.factorycare.backend.domain.equipment.controller;

import com.factorycare.backend.domain.equipment.dto.EquipmentTypeCreateRequest;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeResponse;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeUpdateRequest;
import com.factorycare.backend.domain.equipment.service.EquipmentTypeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/equipment-types")
public class EquipmentTypeController {

    private final EquipmentTypeService equipmentTypeService;

    public EquipmentTypeController(EquipmentTypeService equipmentTypeService) {
        this.equipmentTypeService = equipmentTypeService;
    }

    @GetMapping
    public ResponseEntity<List<EquipmentTypeResponse>> getAll() {
        return ResponseEntity.ok(equipmentTypeService.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipmentTypeResponse> create(@Valid @RequestBody EquipmentTypeCreateRequest request) {
        EquipmentTypeResponse response = equipmentTypeService.create(request);
        return ResponseEntity.created(URI.create("/api/equipment-types/" + response.id())).body(response);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipmentTypeResponse> update(@PathVariable Long id,
                                                         @RequestBody EquipmentTypeUpdateRequest request) {
        return ResponseEntity.ok(equipmentTypeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        equipmentTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
