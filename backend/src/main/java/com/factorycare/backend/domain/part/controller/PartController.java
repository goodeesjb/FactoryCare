package com.factorycare.backend.domain.part.controller;

import com.factorycare.backend.domain.part.dto.*;
import com.factorycare.backend.domain.part.entity.StockStatus;
import com.factorycare.backend.domain.part.service.PartService;
import com.factorycare.backend.domain.part.service.PartUsageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/parts")
public class PartController {

    private final PartService partService;
    private final PartUsageService partUsageService;

    public PartController(PartService partService, PartUsageService partUsageService) {
        this.partService = partService;
        this.partUsageService = partUsageService;
    }

    @GetMapping
    public ResponseEntity<Page<PartResponse>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String storageLocation,
            @RequestParam(required = false) StockStatus stockStatus,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(partService.search(
            new PartSearchCondition(keyword, storageLocation, stockStatus), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PartResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(partService.findById(id));
    }

    @GetMapping("/{id}/usages")
    public ResponseEntity<List<PartUsageResponse>> getUsages(@PathVariable Long id) {
        return ResponseEntity.ok(partUsageService.findByPartId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PartResponse> create(@Valid @RequestBody PartCreateRequest req) {
        PartResponse res = partService.create(req);
        return ResponseEntity.created(URI.create("/api/parts/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PartResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody PartUpdateRequest req) {
        return ResponseEntity.ok(partService.update(id, req));
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PartResponse> adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody PartStockAdjustRequest req) {
        return ResponseEntity.ok(partService.adjustStock(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        partService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
