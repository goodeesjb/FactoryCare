package com.factorycare.backend.domain.equipment.service;

import com.factorycare.backend.domain.equipment.dto.EquipmentTypeCreateRequest;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeResponse;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeUpdateRequest;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EquipmentTypeService {

    private final EquipmentTypeRepository equipmentTypeRepository;

    public EquipmentTypeService(EquipmentTypeRepository equipmentTypeRepository) {
        this.equipmentTypeRepository = equipmentTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<EquipmentTypeResponse> findAll() {
        return equipmentTypeRepository.findAll().stream()
                .map(EquipmentTypeResponse::from)
                .toList();
    }

    @Transactional
    public EquipmentTypeResponse create(EquipmentTypeCreateRequest request) {
        if (equipmentTypeRepository.existsByName(request.name())) {
            throw new IllegalStateException("이미 사용 중인 유형명입니다.");
        }
        EquipmentType type = EquipmentType.builder()
                .name(request.name())
                .description(request.description())
                .build();
        return EquipmentTypeResponse.from(equipmentTypeRepository.save(type));
    }

    @Transactional
    public EquipmentTypeResponse update(Long id, EquipmentTypeUpdateRequest request) {
        EquipmentType type = getEquipmentType(id);
        type.update(request.name(), request.description());
        return EquipmentTypeResponse.from(type);
    }

    @Transactional
    public void delete(Long id) {
        EquipmentType type = getEquipmentType(id);
        if (equipmentTypeRepository.isUsedByEquipment(id)) {
            throw new IllegalStateException("사용 중인 설비유형은 삭제할 수 없습니다.");
        }
        equipmentTypeRepository.delete(type);
    }

    public EquipmentType getEquipmentType(Long id) {
        return equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("설비유형을 찾을 수 없습니다. id=" + id));
    }
}
