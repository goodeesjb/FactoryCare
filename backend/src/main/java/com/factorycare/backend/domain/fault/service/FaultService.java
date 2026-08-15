package com.factorycare.backend.domain.fault.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.dto.*;
import com.factorycare.backend.domain.fault.entity.*;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FaultService {

    private final FaultRepository faultRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;

    public FaultService(FaultRepository faultRepository,
                        EquipmentRepository equipmentRepository,
                        UserRepository userRepository) {
        this.faultRepository = faultRepository;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<FaultResponse> search(FaultSearchCondition cond, Pageable pageable) {
        return faultRepository.search(cond, pageable).map(FaultResponse::from);
    }

    @Transactional(readOnly = true)
    public FaultResponse findById(Long id) {
        return FaultResponse.from(getFault(id));
    }

    @Transactional
    public FaultResponse create(FaultCreateRequest req, Long reporterId) {
        Equipment equipment = equipmentRepository.findByIdAndActiveTrue(req.equipmentId())
            .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다."));
        User reporter = getUser(reporterId);

        Fault fault = Fault.builder()
            .equipment(equipment).title(req.title())
            .description(req.description()).severity(req.severity())
            .reportedBy(reporter).build();

        return FaultResponse.from(faultRepository.save(fault));
    }

    @Transactional
    public FaultResponse createFromInspectionResult(InspectionResult result, User reporter) {
        Equipment equipment = result.getInspection().getSchedule().getEquipment();
        Fault fault = Fault.builder()
            .equipment(equipment)
            .title("[점검이상] " + result.getItemName())
            .description(result.getNote())
            .severity(FaultSeverity.MEDIUM)
            .reportedBy(reporter)
            .inspectionResult(result)
            .build();
        return FaultResponse.from(faultRepository.save(fault));
    }

    @Transactional
    public FaultResponse update(Long id, FaultUpdateRequest req) {
        Fault fault = getFault(id);
        fault.update(req.title(), req.description(), req.severity());
        return FaultResponse.from(fault);
    }

    @Transactional
    public FaultResponse changeStatus(Long id, FaultStatusChangeRequest req, Long userId) {
        Fault fault = getFault(id);
        FaultStatus oldStatus = fault.getStatus();
        fault.changeStatus(req.status());

        FaultStatusHistory history = FaultStatusHistory.builder()
            .fault(fault).changedBy(getUser(userId))
            .fromStatus(oldStatus).toStatus(req.status()).reason(req.reason())
            .build();
        fault.getStatusHistories().add(history);

        return FaultResponse.from(fault);
    }

    @Transactional
    public FaultResponse assign(Long id, FaultAssignRequest req) {
        Fault fault = getFault(id);
        fault.assignTo(getUser(req.assigneeId()));
        return FaultResponse.from(fault);
    }

    @Transactional
    public void delete(Long id) {
        faultRepository.delete(getFault(id));
    }

    Fault getFault(Long id) {
        return faultRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("장애를 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
