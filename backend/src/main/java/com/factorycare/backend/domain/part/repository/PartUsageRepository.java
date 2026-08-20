package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.entity.PartUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartUsageRepository extends JpaRepository<PartUsage, Long> {
    List<PartUsage> findByMaintenanceTaskId(Long maintenanceTaskId);
    List<PartUsage> findByPartId(Long partId);
}
