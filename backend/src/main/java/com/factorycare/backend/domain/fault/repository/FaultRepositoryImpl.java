package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.dto.FaultSearchCondition;
import com.factorycare.backend.domain.fault.entity.*;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public class FaultRepositoryImpl implements FaultRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public FaultRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<Fault> search(FaultSearchCondition cond, Pageable pageable) {
        QFault qf = QFault.fault;

        List<Fault> content = queryFactory
            .selectFrom(qf)
            .where(
                equipmentEq(qf, cond.equipmentId()),
                statusEq(qf, cond.status()),
                severityEq(qf, cond.severity()),
                assigneeEq(qf, cond.assigneeId()),
                dateFrom(qf, cond.from()),
                dateTo(qf, cond.to())
            )
            .orderBy(qf.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory
            .select(qf.count()).from(qf)
            .where(
                equipmentEq(qf, cond.equipmentId()),
                statusEq(qf, cond.status()),
                severityEq(qf, cond.severity()),
                assigneeEq(qf, cond.assigneeId()),
                dateFrom(qf, cond.from()),
                dateTo(qf, cond.to())
            ).fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentEq(QFault qf, Long id) {
        return id != null ? qf.equipment.id.eq(id) : null;
    }
    private BooleanExpression statusEq(QFault qf, FaultStatus s) {
        return s != null ? qf.status.eq(s) : null;
    }
    private BooleanExpression severityEq(QFault qf, FaultSeverity s) {
        return s != null ? qf.severity.eq(s) : null;
    }
    private BooleanExpression assigneeEq(QFault qf, Long id) {
        return id != null ? qf.assignedTo.id.eq(id) : null;
    }
    private BooleanExpression dateFrom(QFault qf, LocalDate from) {
        return from != null ? qf.createdAt.goe(from.atStartOfDay()) : null;
    }
    private BooleanExpression dateTo(QFault qf, LocalDate to) {
        return to != null ? qf.createdAt.lt(to.plusDays(1).atStartOfDay()) : null;
    }
}