package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.part.dto.PartUsageCreateRequest;
import com.factorycare.backend.domain.part.dto.PartUsageResponse;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.PartUsage;
import com.factorycare.backend.domain.part.repository.PartRepository;
import com.factorycare.backend.domain.part.repository.PartUsageRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PartUsageService {

    private final PartUsageRepository partUsageRepository;
    private final PartRepository partRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final UserRepository userRepository;

    public PartUsageService(PartUsageRepository partUsageRepository,
                            PartRepository partRepository,
                            MaintenanceRepository maintenanceRepository,
                            UserRepository userRepository) {
        this.partUsageRepository = partUsageRepository;
        this.partRepository = partRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<PartUsageResponse> findByMaintenanceId(Long maintenanceId) {
        return partUsageRepository.findByMaintenanceTaskId(maintenanceId).stream()
            .map(PartUsageResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PartUsageResponse> findByPartId(Long partId) {
        return partUsageRepository.findByPartId(partId).stream()
            .map(PartUsageResponse::from).toList();
    }

    @Transactional
    public PartUsageResponse create(Long maintenanceId, PartUsageCreateRequest req, Long userId) {
        MaintenanceTask task = maintenanceRepository.findById(maintenanceId)
            .orElseThrow(() -> new IllegalArgumentException("유지보수 작업을 찾을 수 없습니다. id=" + maintenanceId));
        if (task.getStatus() == MaintenanceStatus.COMPLETED
                || task.getStatus() == MaintenanceStatus.CANCELLED) {
            throw new IllegalStateException("완료 또는 취소된 작업에는 부품을 추가할 수 없습니다.");
        }
        Part part = partRepository.findByIdAndActiveTrue(req.partId())
            .orElseThrow(() -> new IllegalArgumentException("부품을 찾을 수 없습니다. id=" + req.partId()));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + userId));

        part.decreaseStock(req.quantity());

        PartUsage usage = PartUsage.builder()
            .part(part).maintenanceTask(task)
            .quantity(req.quantity()).note(req.note())
            .usedBy(user).build();

        return PartUsageResponse.from(partUsageRepository.save(usage));
    }

    @Transactional
    public void delete(Long maintenanceId, Long usageId) {
        PartUsage usage = partUsageRepository.findById(usageId)
            .orElseThrow(() -> new IllegalArgumentException("부품 사용 이력을 찾을 수 없습니다. id=" + usageId));
        if (!usage.getMaintenanceTask().getId().equals(maintenanceId)) {
            throw new IllegalArgumentException("해당 유지보수 작업의 이력이 아닙니다.");
        }
        if (usage.getMaintenanceTask().getStatus() == MaintenanceStatus.COMPLETED
                || usage.getMaintenanceTask().getStatus() == MaintenanceStatus.CANCELLED) {
            throw new IllegalStateException("완료 또는 취소된 작업의 부품 사용 이력은 삭제할 수 없습니다.");
        }
        usage.getPart().increaseStock(usage.getQuantity());
        partUsageRepository.delete(usage);
    }
}
