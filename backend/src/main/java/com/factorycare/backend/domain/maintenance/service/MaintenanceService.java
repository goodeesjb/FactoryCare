package com.factorycare.backend.domain.maintenance.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.maintenance.dto.*;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;
    private final FaultRepository faultRepository;

    public MaintenanceService(MaintenanceRepository maintenanceRepository,
                              EquipmentRepository equipmentRepository,
                              UserRepository userRepository,
                              FaultRepository faultRepository) {
        this.maintenanceRepository = maintenanceRepository;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
        this.faultRepository = faultRepository;
    }

    @Transactional(readOnly = true)
    public Page<MaintenanceResponse> search(MaintenanceSearchCondition cond, Pageable pageable) {
        return maintenanceRepository.search(cond, pageable).map(MaintenanceResponse::from);
    }

    @Transactional(readOnly = true)
    public MaintenanceResponse findById(Long id) {
        return MaintenanceResponse.from(getTask(id));
    }

    @Transactional
    public MaintenanceResponse create(MaintenanceCreateRequest req, Long creatorId) {
        Equipment equipment = equipmentRepository.findByIdAndActiveTrue(req.equipmentId())
            .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다."));
        User creator = getUser(creatorId);
        Fault fault = req.faultId() != null
            ? faultRepository.findById(req.faultId())
                .orElseThrow(() -> new IllegalArgumentException("장애를 찾을 수 없습니다."))
            : null;
        User assignee = req.assigneeId() != null ? getUser(req.assigneeId()) : null;

        MaintenanceTask task = MaintenanceTask.builder()
            .taskNo(generateTaskNo())
            .equipment(equipment).fault(fault)
            .title(req.title()).description(req.description())
            .taskType(req.taskType()).priority(req.priority())
            .assignee(assignee).scheduledDate(req.scheduledDate())
            .createdBy(creator).build();

        return MaintenanceResponse.from(maintenanceRepository.save(task));
    }

    @Transactional
    public MaintenanceResponse update(Long id, MaintenanceUpdateRequest req) {
        MaintenanceTask task = getTask(id);
        task.update(req.title(), req.description(), req.taskType(), req.priority(), req.scheduledDate());
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse assign(Long id, MaintenanceAssignRequest req) {
        MaintenanceTask task = getTask(id);
        task.assignTo(getUser(req.assigneeId()));
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse start(Long id, MaintenanceStartRequest req, Long userId) {
        MaintenanceTask task = getTask(id);
        task.start();
        MaintenanceHistory history = MaintenanceHistory.builder()
            .maintenanceTask(task).recordedBy(getUser(userId))
            .type(MaintenanceHistoryType.START).content(req.content())
            .build();
        task.getHistories().add(history);
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse complete(Long id, MaintenanceCompleteRequest req, Long userId) {
        MaintenanceTask task = getTask(id);
        task.complete();
        MaintenanceHistory history = MaintenanceHistory.builder()
            .maintenanceTask(task).recordedBy(getUser(userId))
            .type(MaintenanceHistoryType.COMPLETE).content(req.content())
            .durationMinutes(req.durationMinutes())
            .build();
        task.getHistories().add(history);
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse cancel(Long id) {
        MaintenanceTask task = getTask(id);
        task.cancel();
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public void delete(Long id) {
        MaintenanceTask task = getTask(id);
        if (task.getStatus() == MaintenanceStatus.COMPLETED) {
            throw new IllegalStateException("완료된 작업은 삭제할 수 없습니다.");
        }
        maintenanceRepository.delete(task);
    }

    private String generateTaskNo() {
        int year = LocalDate.now().getYear();
        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(year + 1, 1, 1).atStartOfDay();
        long count = maintenanceRepository.countByCreatedAtBetween(start, end);
        return String.format("MT-%d-%03d", year, count + 1);
    }

    private MaintenanceTask getTask(Long id) {
        return maintenanceRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("유지보수 작업을 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
