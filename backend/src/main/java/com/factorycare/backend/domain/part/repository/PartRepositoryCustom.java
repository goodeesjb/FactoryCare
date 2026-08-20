package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.dto.PartSearchCondition;
import com.factorycare.backend.domain.part.entity.Part;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PartRepositoryCustom {
    Page<Part> search(PartSearchCondition cond, Pageable pageable);
}
