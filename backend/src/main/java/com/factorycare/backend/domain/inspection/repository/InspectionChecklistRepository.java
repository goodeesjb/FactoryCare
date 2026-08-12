package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InspectionChecklistRepository extends JpaRepository<InspectionChecklist, Long> {
    @Query("SELECT DISTINCT c FROM InspectionChecklist c LEFT JOIN FETCH c.items WHERE c.active = true ORDER BY c.createdAt DESC")
    List<InspectionChecklist> findAllActiveWithItems();
    Optional<InspectionChecklist> findByIdAndActiveTrue(Long id);
}
