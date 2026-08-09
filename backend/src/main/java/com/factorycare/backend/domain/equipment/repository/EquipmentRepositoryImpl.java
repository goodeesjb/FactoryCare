package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.dto.EquipmentSearchCondition;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.QEquipment;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.util.StringUtils;

import java.util.List;

public class EquipmentRepositoryImpl implements EquipmentRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public EquipmentRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<Equipment> search(EquipmentSearchCondition cond, Pageable pageable) {
        QEquipment eq = QEquipment.equipment;

        List<Equipment> content = queryFactory
                .selectFrom(eq)
                .where(
                        eq.active.isTrue(),
                        equipmentNoContains(eq, cond.equipmentNo()),
                        nameContains(eq, cond.name()),
                        typeEq(eq, cond.typeId()),
                        statusEq(eq, cond.status()),
                        locationContains(eq, cond.location()),
                        assigneeEq(eq, cond.assigneeId())
                )
                .orderBy(getOrderSpecifiers(eq, pageable.getSort()))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(eq.count())
                .from(eq)
                .where(
                        eq.active.isTrue(),
                        equipmentNoContains(eq, cond.equipmentNo()),
                        nameContains(eq, cond.name()),
                        typeEq(eq, cond.typeId()),
                        statusEq(eq, cond.status()),
                        locationContains(eq, cond.location()),
                        assigneeEq(eq, cond.assigneeId())
                )
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentNoContains(QEquipment eq, String equipmentNo) {
        return StringUtils.hasText(equipmentNo) ? eq.equipmentNo.containsIgnoreCase(equipmentNo) : null;
    }

    private BooleanExpression nameContains(QEquipment eq, String name) {
        return StringUtils.hasText(name) ? eq.name.containsIgnoreCase(name) : null;
    }

    private BooleanExpression typeEq(QEquipment eq, Long typeId) {
        return typeId != null ? eq.type.id.eq(typeId) : null;
    }

    private BooleanExpression statusEq(QEquipment eq, EquipmentStatus status) {
        return status != null ? eq.status.eq(status) : null;
    }

    private BooleanExpression locationContains(QEquipment eq, String location) {
        return StringUtils.hasText(location) ? eq.location.containsIgnoreCase(location) : null;
    }

    private BooleanExpression assigneeEq(QEquipment eq, Long assigneeId) {
        return assigneeId != null ? eq.assignee.id.eq(assigneeId) : null;
    }

    private OrderSpecifier<?>[] getOrderSpecifiers(QEquipment eq, Sort sort) {
        if (sort.isUnsorted()) {
            return new OrderSpecifier[]{eq.createdAt.desc()};
        }
        return sort.stream()
                .map(order -> {
                    Order direction = order.isAscending() ? Order.ASC : Order.DESC;
                    return switch (order.getProperty()) {
                        case "name" -> new OrderSpecifier<>(direction, eq.name);
                        case "status" -> new OrderSpecifier<>(direction, eq.status);
                        case "equipmentNo" -> new OrderSpecifier<>(direction, eq.equipmentNo);
                        default -> new OrderSpecifier<>(Order.DESC, eq.createdAt);
                    };
                })
                .toArray(OrderSpecifier[]::new);
    }
}
