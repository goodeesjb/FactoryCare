package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import com.factorycare.backend.domain.inspection.entity.InspectionChecklistItem;
import com.factorycare.backend.domain.inspection.repository.InspectionChecklistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class InspectionChecklistService {

    private final InspectionChecklistRepository checklistRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;

    public InspectionChecklistService(InspectionChecklistRepository checklistRepository,
                                      EquipmentTypeRepository equipmentTypeRepository) {
        this.checklistRepository = checklistRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<InspectionChecklistResponse> findAll() {
        return checklistRepository.findAllByActiveTrueOrderByCreatedAtDesc()
            .stream().map(InspectionChecklistResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public InspectionChecklistResponse findById(Long id) {
        return InspectionChecklistResponse.from(getChecklist(id));
    }

    @Transactional
    public InspectionChecklistResponse create(InspectionChecklistCreateRequest req) {
        EquipmentType type = req.equipmentTypeId() != null
            ? equipmentTypeRepository.findById(req.equipmentTypeId())
                .orElseThrow(() -> new IllegalArgumentException("설비유형을 찾을 수 없습니다."))
            : null;

        InspectionChecklist checklist = InspectionChecklist.builder()
            .name(req.name()).description(req.description()).equipmentType(type).build();

        addItems(checklist, req.itemNames());
        return InspectionChecklistResponse.from(checklistRepository.save(checklist));
    }

    @Transactional
    public InspectionChecklistResponse update(Long id, InspectionChecklistUpdateRequest req) {
        InspectionChecklist checklist = getChecklist(id);
        EquipmentType type = req.equipmentTypeId() != null
            ? equipmentTypeRepository.findById(req.equipmentTypeId())
                .orElseThrow(() -> new IllegalArgumentException("설비유형을 찾을 수 없습니다."))
            : null;

        checklist.update(req.name(), req.description(), type);
        if (req.itemNames() != null && !req.itemNames().isEmpty()) {
            checklist.replaceItems(buildItems(checklist, req.itemNames()));
        }
        return InspectionChecklistResponse.from(checklist);
    }

    @Transactional
    public void deactivate(Long id) {
        getChecklist(id).deactivate();
    }

    InspectionChecklist getChecklist(Long id) {
        return checklistRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("체크리스트를 찾을 수 없습니다. id=" + id));
    }

    private void addItems(InspectionChecklist checklist, List<String> itemNames) {
        checklist.replaceItems(buildItems(checklist, itemNames));
    }

    private List<InspectionChecklistItem> buildItems(InspectionChecklist checklist, List<String> itemNames) {
        AtomicInteger order = new AtomicInteger(1);
        return itemNames.stream()
            .map(name -> InspectionChecklistItem.builder()
                .checklist(checklist).itemName(name).itemOrder(order.getAndIncrement()).build())
            .toList();
    }
}