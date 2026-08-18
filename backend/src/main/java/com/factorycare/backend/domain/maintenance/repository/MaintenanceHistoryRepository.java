package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceHistoryRepository extends JpaRepository<MaintenanceHistory, Long> {}
