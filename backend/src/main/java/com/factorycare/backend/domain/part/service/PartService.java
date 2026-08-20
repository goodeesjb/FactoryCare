package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.part.dto.*;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.repository.PartRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class PartService {

    private final PartRepository partRepository;

    public PartService(PartRepository partRepository) {
        this.partRepository = partRepository;
    }

    @Transactional(readOnly = true)
    public Page<PartResponse> search(PartSearchCondition cond, Pageable pageable) {
        return partRepository.search(cond, pageable).map(PartResponse::from);
    }

    @Transactional(readOnly = true)
    public PartResponse findById(Long id) {
        return PartResponse.from(getActivePart(id));
    }

    @Transactional
    public PartResponse create(PartCreateRequest req) {
        Part part = Part.builder()
            .partNo(generatePartNo())
            .name(req.name())
            .manufacturer(req.manufacturer())
            .stockQuantity(req.stockQuantity())
            .minimumStock(req.minimumStock())
            .storageLocation(req.storageLocation())
            .description(req.description())
            .build();
        try {
            return PartResponse.from(partRepository.save(part));
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("부품번호 생성 중 충돌이 발생했습니다. 다시 시도해주세요.");
        }
    }

    @Transactional
    public PartResponse update(Long id, PartUpdateRequest req) {
        Part part = getActivePart(id);
        part.update(req.name(), req.manufacturer(), req.minimumStock(),
                    req.storageLocation(), req.description());
        return PartResponse.from(part);
    }

    @Transactional
    public PartResponse adjustStock(Long id, PartStockAdjustRequest req) {
        Part part = getActivePart(id);
        part.adjustStock(req.newQuantity());
        return PartResponse.from(part);
    }

    @Transactional
    public void delete(Long id) {
        Part part = getActivePart(id);
        part.deactivate();
    }

    private Part getActivePart(Long id) {
        return partRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("부품을 찾을 수 없습니다. id=" + id));
    }

    private String generatePartNo() {
        int year = LocalDate.now().getYear();
        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(year + 1, 1, 1).atStartOfDay();
        long count = partRepository.countByCreatedAtBetween(start, end);
        return String.format("PT-%d-%03d", year, count + 1);
    }
}
