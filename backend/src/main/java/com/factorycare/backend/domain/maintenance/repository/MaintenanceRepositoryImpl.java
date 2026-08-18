package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.dto.MaintenanceSearchCondition;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public class MaintenanceRepositoryImpl implements MaintenanceRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public MaintenanceRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<MaintenanceTask> search(MaintenanceSearchCondition cond, Pageable pageable) {
        QMaintenanceTask qm = QMaintenanceTask.maintenanceTask;

        List<MaintenanceTask> content = queryFactory
            .selectFrom(qm)
            .where(
                equipmentEq(qm, cond.equipmentId()),
                statusEq(qm, cond.status()),
                priorityEq(qm, cond.priority()),
                assigneeEq(qm, cond.assigneeId()),
                faultEq(qm, cond.faultId()),
                dateFrom(qm, cond.from()),
                dateTo(qm, cond.to())
            )
            .orderBy(qm.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory
            .select(qm.count()).from(qm)
            .where(
                equipmentEq(qm, cond.equipmentId()),
                statusEq(qm, cond.status()),
                priorityEq(qm, cond.priority()),
                assigneeEq(qm, cond.assigneeId()),
                faultEq(qm, cond.faultId()),
                dateFrom(qm, cond.from()),
                dateTo(qm, cond.to())
            ).fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentEq(QMaintenanceTask qm, Long id) {
        return id != null ? qm.equipment.id.eq(id) : null;
    }
    private BooleanExpression statusEq(QMaintenanceTask qm, MaintenanceStatus s) {
        return s != null ? qm.status.eq(s) : null;
    }
    private BooleanExpression priorityEq(QMaintenanceTask qm, MaintenancePriority p) {
        return p != null ? qm.priority.eq(p) : null;
    }
    private BooleanExpression assigneeEq(QMaintenanceTask qm, Long id) {
        return id != null ? qm.assignee.id.eq(id) : null;
    }
    private BooleanExpression faultEq(QMaintenanceTask qm, Long id) {
        return id != null ? qm.fault.id.eq(id) : null;
    }
    private BooleanExpression dateFrom(QMaintenanceTask qm, LocalDate from) {
        return from != null ? qm.scheduledDate.goe(from) : null;
    }
    private BooleanExpression dateTo(QMaintenanceTask qm, LocalDate to) {
        return to != null ? qm.scheduledDate.loe(to) : null;
    }
}
