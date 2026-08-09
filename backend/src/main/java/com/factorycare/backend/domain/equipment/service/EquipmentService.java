package com.factorycare.backend.domain.equipment.service;

import com.factorycare.backend.domain.equipment.dto.*;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;
    private final EquipmentTypeService equipmentTypeService;
    private final UserRepository userRepository;

    public EquipmentService(EquipmentRepository equipmentRepository,
                            EquipmentTypeService equipmentTypeService,
                            UserRepository userRepository) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeService = equipmentTypeService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<EquipmentResponse> search(EquipmentSearchCondition condition, Pageable pageable) {
        return equipmentRepository.search(condition, pageable).map(EquipmentResponse::from);
    }

    @Transactional(readOnly = true)
    public EquipmentResponse findById(Long id) {
        return EquipmentResponse.from(getEquipment(id));
    }

    @Transactional
    public EquipmentResponse create(EquipmentCreateRequest request) {
        if (equipmentRepository.existsByEquipmentNo(request.equipmentNo())) {
            throw new IllegalStateException("이미 사용 중인 설비번호입니다.");
        }
        EquipmentType type = request.typeId() != null ? equipmentTypeService.getEquipmentType(request.typeId()) : null;
        User assignee = request.assigneeId() != null ? getUser(request.assigneeId()) : null;

        Equipment equipment = Equipment.builder()
                .equipmentNo(request.equipmentNo())
                .name(request.name())
                .type(type)
                .manufacturer(request.manufacturer())
                .modelName(request.modelName())
                .installedAt(request.installedAt())
                .location(request.location())
                .department(request.department())
                .assignee(assignee)
                .description(request.description())
                .build();

        return EquipmentResponse.from(equipmentRepository.save(equipment));
    }

    @Transactional
    public EquipmentResponse update(Long id, EquipmentUpdateRequest request) {
        Equipment equipment = getEquipment(id);
        EquipmentType type = request.typeId() != null ? equipmentTypeService.getEquipmentType(request.typeId()) : null;
        User assignee = request.assigneeId() != null ? getUser(request.assigneeId()) : null;

        equipment.update(request.name(), type, request.manufacturer(), request.modelName(),
                request.installedAt(), request.location(), request.department(), assignee, request.description());

        return EquipmentResponse.from(equipment);
    }

    @Transactional
    public void deactivate(Long id) {
        getEquipment(id).deactivate();
    }

    Equipment getEquipment(Long id) {
        return equipmentRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
