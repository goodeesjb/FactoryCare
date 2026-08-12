package com.factorycare.backend.domain.inspection.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "inspections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Inspection {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private InspectionSchedule schedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspector_id", nullable = false)
    private User inspector;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionStatus status = InspectionStatus.IN_PROGRESS;

    @Column(nullable = false)
    private boolean hasAbnormality = false;

    private LocalDateTime completedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Inspection(InspectionSchedule schedule, User inspector) {
        this.schedule = schedule;
        this.inspector = inspector;
    }

    public void complete(boolean hasAbnormality) {
        this.status = InspectionStatus.COMPLETED;
        this.hasAbnormality = hasAbnormality;
        this.completedAt = LocalDateTime.now();
    }
}