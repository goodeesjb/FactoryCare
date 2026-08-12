package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.dto.InspectionScheduleSearchCondition;
import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.entity.QInspectionSchedule;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public class InspectionScheduleRepositoryImpl implements InspectionScheduleRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public InspectionScheduleRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<InspectionSchedule> search(InspectionScheduleSearchCondition cond, Pageable pageable) {
        QInspectionSchedule qs = QInspectionSchedule.inspectionSchedule;

        List<InspectionSchedule> content = queryFactory
            .selectFrom(qs)
            .where(
                equipmentEq(qs, cond.equipmentId()),
                assigneeEq(qs, cond.assigneeId()),
                statusEq(qs, cond.status()),
                dateFrom(qs, cond.from()),
                dateTo(qs, cond.to())
            )
            .orderBy(qs.scheduledDate.asc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory.select(qs.count()).from(qs)
            .where(
                equipmentEq(qs, cond.equipmentId()),
                assigneeEq(qs, cond.assigneeId()),
                statusEq(qs, cond.status()),
                dateFrom(qs, cond.from()),
                dateTo(qs, cond.to())
            ).fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentEq(QInspectionSchedule qs, Long equipmentId) {
        return equipmentId != null ? qs.equipment.id.eq(equipmentId) : null;
    }

    private BooleanExpression assigneeEq(QInspectionSchedule qs, Long assigneeId) {
        return assigneeId != null ? qs.assignee.id.eq(assigneeId) : null;
    }

    private BooleanExpression statusEq(QInspectionSchedule qs, InspectionScheduleStatus status) {
        return status != null ? qs.status.eq(status) : null;
    }

    private BooleanExpression dateFrom(QInspectionSchedule qs, LocalDate from) {
        return from != null ? qs.scheduledDate.goe(from) : null;
    }

    private BooleanExpression dateTo(QInspectionSchedule qs, LocalDate to) {
        return to != null ? qs.scheduledDate.loe(to) : null;
    }
}