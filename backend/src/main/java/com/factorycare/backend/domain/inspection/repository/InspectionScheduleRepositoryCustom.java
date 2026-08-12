package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.dto.InspectionScheduleSearchCondition;
import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InspectionScheduleRepositoryCustom {
    Page<InspectionSchedule> search(InspectionScheduleSearchCondition cond, Pageable pageable);
}