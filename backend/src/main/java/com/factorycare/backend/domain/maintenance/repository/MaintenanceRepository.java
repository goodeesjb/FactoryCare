package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface MaintenanceRepository extends JpaRepository<MaintenanceTask, Long>, MaintenanceRepositoryCustom {
    @Query("SELECT COUNT(m) FROM MaintenanceTask m WHERE m.createdAt >= :start AND m.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
