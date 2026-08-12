package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InspectionScheduleService {

    private final InspectionScheduleRepository scheduleRepository;
    private final InspectionRepository inspectionRepository;
    private final InspectionChecklistService checklistService;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;

    public InspectionScheduleService(InspectionScheduleRepository scheduleRepository,
                                     InspectionRepository inspectionRepository,
                                     InspectionChecklistService checklistService,
                                     EquipmentRepository equipmentRepository,
                                     UserRepository userRepository) {
        this.scheduleRepository = scheduleRepository;
        this.inspectionRepository = inspectionRepository;
        this.checklistService = checklistService;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<InspectionScheduleResponse> search(InspectionScheduleSearchCondition cond, Pageable pageable) {
        return scheduleRepository.search(cond, pageable).map(InspectionScheduleResponse::from);
    }

    @Transactional(readOnly = true)
    public InspectionScheduleResponse findById(Long id) {
        return InspectionScheduleResponse.from(getSchedule(id));
    }

    @Transactional
    public InspectionScheduleResponse create(InspectionScheduleCreateRequest req) {
        Equipment equipment = equipmentRepository.findByIdAndActiveTrue(req.equipmentId())
            .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다."));
        InspectionChecklist checklist = checklistService.getChecklist(req.checklistId());
        User assignee = getUser(req.assigneeId());

        InspectionSchedule schedule = InspectionSchedule.builder()
            .equipment(equipment).checklist(checklist).assignee(assignee)
            .scheduledDate(req.scheduledDate())
            .inspectionType(req.inspectionType())
            .description(req.description())
            .build();

        return InspectionScheduleResponse.from(scheduleRepository.save(schedule));
    }

    @Transactional
    public InspectionScheduleResponse update(Long id, InspectionScheduleUpdateRequest req) {
        InspectionSchedule schedule = getSchedule(id);
        User assignee = req.assigneeId() != null ? getUser(req.assigneeId()) : null;
        schedule.update(assignee, req.scheduledDate(), req.inspectionType(), req.description());
        return InspectionScheduleResponse.from(schedule);
    }

    @Transactional
    public InspectionResponse startInspection(Long scheduleId, Long inspectorId) {
        InspectionSchedule schedule = getSchedule(scheduleId);
        User inspector = getUser(inspectorId);
        schedule.startInspection();

        Inspection inspection = Inspection.builder()
            .schedule(schedule).inspector(inspector).build();
        return InspectionResponse.from(inspectionRepository.save(inspection));
    }

    @Transactional
    public void delete(Long id) {
        scheduleRepository.delete(getSchedule(id));
    }

    InspectionSchedule getSchedule(Long id) {
        return scheduleRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("점검 일정을 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}