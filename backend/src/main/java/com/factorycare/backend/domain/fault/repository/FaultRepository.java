package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface FaultRepository extends JpaRepository<Fault, Long>, FaultRepositoryCustom {
    long countByStatusIn(List<FaultStatus> statuses);

    @Query(value = "SELECT YEAR(created_at), MONTH(created_at), COUNT(*) " +
                   "FROM faults WHERE created_at >= :start " +
                   "GROUP BY YEAR(created_at), MONTH(created_at) " +
                   "ORDER BY YEAR(created_at), MONTH(created_at)",
           nativeQuery = true)
    List<Object[]> countByYearMonthSince(@Param("start") LocalDateTime start);

    @Query("SELECT f FROM Fault f JOIN FETCH f.equipment ORDER BY f.createdAt DESC")
    List<Fault> findRecentWithEquipment(Pageable pageable);
}
