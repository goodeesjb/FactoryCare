package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionScheduleRepository
    extends JpaRepository<InspectionSchedule, Long>, InspectionScheduleRepositoryCustom {}