package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InspectionChecklistRepository extends JpaRepository<InspectionChecklist, Long> {
    List<InspectionChecklist> findAllByActiveTrueOrderByCreatedAtDesc();
    Optional<InspectionChecklist> findByIdAndActiveTrue(Long id);
}
