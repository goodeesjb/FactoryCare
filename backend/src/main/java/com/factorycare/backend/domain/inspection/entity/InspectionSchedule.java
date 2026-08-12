package com.factorycare.backend.domain.inspection.entity;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inspection_schedules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class InspectionSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    private InspectionChecklist checklist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id", nullable = false)
    private User assignee;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionScheduleType inspectionType = InspectionScheduleType.CUSTOM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionScheduleStatus status = InspectionScheduleStatus.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public InspectionSchedule(Equipment equipment, InspectionChecklist checklist,
                               User assignee, LocalDate scheduledDate,
                               InspectionScheduleType inspectionType, String description) {
        this.equipment = equipment;
        this.checklist = checklist;
        this.assignee = assignee;
        this.scheduledDate = scheduledDate;
        this.inspectionType = inspectionType != null ? inspectionType : InspectionScheduleType.CUSTOM;
        this.description = description;
    }

    public void update(User assignee, LocalDate scheduledDate,
                       InspectionScheduleType inspectionType, String description) {
        if (assignee != null) this.assignee = assignee;
        if (scheduledDate != null) this.scheduledDate = scheduledDate;
        if (inspectionType != null) this.inspectionType = inspectionType;
        if (description != null) this.description = description;
    }

    public void startInspection() {
        if (this.status != InspectionScheduleStatus.SCHEDULED) {
            throw new IllegalStateException("SCHEDULED 상태에서만 점검을 시작할 수 있습니다.");
        }
        this.status = InspectionScheduleStatus.IN_PROGRESS;
    }

    public void complete() {
        if (this.status == InspectionScheduleStatus.COMPLETED) return;
        this.status = InspectionScheduleStatus.COMPLETED;
    }
}