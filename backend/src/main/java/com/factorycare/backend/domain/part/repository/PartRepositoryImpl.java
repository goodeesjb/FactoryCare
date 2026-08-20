package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.dto.PartSearchCondition;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.QPart;
import com.factorycare.backend.domain.part.entity.StockStatus;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

public class PartRepositoryImpl implements PartRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public PartRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<Part> search(PartSearchCondition cond, Pageable pageable) {
        QPart qp = QPart.part;

        List<Part> content = queryFactory
            .selectFrom(qp)
            .where(
                qp.active.isTrue(),
                keywordContains(qp, cond.keyword()),
                locationContains(qp, cond.storageLocation()),
                stockStatusEq(qp, cond.stockStatus())
            )
            .orderBy(qp.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory
            .select(qp.count())
            .from(qp)
            .where(
                qp.active.isTrue(),
                keywordContains(qp, cond.keyword()),
                locationContains(qp, cond.storageLocation()),
                stockStatusEq(qp, cond.stockStatus())
            )
            .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression keywordContains(QPart qp, String keyword) {
        return StringUtils.hasText(keyword)
            ? qp.name.containsIgnoreCase(keyword).or(qp.manufacturer.containsIgnoreCase(keyword))
            : null;
    }

    private BooleanExpression locationContains(QPart qp, String location) {
        return StringUtils.hasText(location) ? qp.storageLocation.containsIgnoreCase(location) : null;
    }

    private BooleanExpression stockStatusEq(QPart qp, StockStatus stockStatus) {
        if (stockStatus == null) return null;
        return switch (stockStatus) {
            case OUT -> qp.stockQuantity.eq(0);
            case LOW -> qp.stockQuantity.gt(0).and(qp.stockQuantity.loe(qp.minimumStock));
            case NORMAL -> qp.stockQuantity.gt(qp.minimumStock);
        };
    }
}
