package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.dto.FaultSearchCondition;
import com.factorycare.backend.domain.fault.entity.Fault;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FaultRepositoryCustom {
    Page<Fault> search(FaultSearchCondition cond, Pageable pageable);
}