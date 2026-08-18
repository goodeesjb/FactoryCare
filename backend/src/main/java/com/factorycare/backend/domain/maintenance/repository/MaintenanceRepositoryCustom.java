package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.dto.MaintenanceSearchCondition;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MaintenanceRepositoryCustom {
    Page<MaintenanceTask> search(MaintenanceSearchCondition cond, Pageable pageable);
}
