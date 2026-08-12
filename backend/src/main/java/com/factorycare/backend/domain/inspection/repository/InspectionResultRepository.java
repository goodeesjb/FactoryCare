package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InspectionResultRepository extends JpaRepository<InspectionResult, Long> {
    List<InspectionResult> findByInspectionIdOrderByChecklistItemItemOrderAsc(Long inspectionId);
}
