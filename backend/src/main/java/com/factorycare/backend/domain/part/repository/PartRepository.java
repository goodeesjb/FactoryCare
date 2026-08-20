package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.entity.Part;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PartRepository extends JpaRepository<Part, Long>, PartRepositoryCustom {
    Optional<Part> findByIdAndActiveTrue(Long id);

    @Query("SELECT COUNT(p) FROM Part p WHERE p.createdAt >= :start AND p.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
