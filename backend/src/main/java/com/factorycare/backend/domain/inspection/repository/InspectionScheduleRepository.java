package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface InspectionScheduleRepository
    extends JpaRepository<InspectionSchedule, Long>, InspectionScheduleRepositoryCustom {
    long countByScheduledDateBetweenAndStatus(LocalDate start, LocalDate end, InspectionScheduleStatus status);
}
