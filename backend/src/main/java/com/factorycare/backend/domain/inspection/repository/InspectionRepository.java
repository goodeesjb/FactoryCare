package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.Inspection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InspectionRepository extends JpaRepository<Inspection, Long> {
    List<Inspection> findByScheduleIdOrderByCreatedAtDesc(Long scheduleId);
}