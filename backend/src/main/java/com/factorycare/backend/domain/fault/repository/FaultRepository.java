package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.entity.Fault;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaultRepository extends JpaRepository<Fault, Long>, FaultRepositoryCustom {}