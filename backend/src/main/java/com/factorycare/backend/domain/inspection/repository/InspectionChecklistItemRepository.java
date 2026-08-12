package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionChecklistItemRepository extends JpaRepository<InspectionChecklistItem, Long> {}
