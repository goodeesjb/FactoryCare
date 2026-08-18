package com.factorycare.backend.domain.maintenance.entity;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "maintenance_tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MaintenanceTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String taskNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fault_id")
    private Fault fault;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenanceType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenancePriority priority = MaintenancePriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenanceStatus status = MaintenanceStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    private LocalDateTime completedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "maintenanceTask", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("recordedAt ASC")
    private List<MaintenanceHistory> histories = new ArrayList<>();

    @Builder
    public MaintenanceTask(String taskNo, Equipment equipment, Fault fault,
                           String title, String description, MaintenanceType taskType,
                           MaintenancePriority priority, User assignee,
                           LocalDate scheduledDate, User createdBy) {
        this.taskNo = taskNo;
        this.equipment = equipment;
        this.fault = fault;
        this.title = title;
        this.description = description;
        this.taskType = taskType != null ? taskType : MaintenanceType.REPAIR;
        this.priority = priority != null ? priority : MaintenancePriority.MEDIUM;
        this.assignee = assignee;
        this.scheduledDate = scheduledDate;
        this.createdBy = createdBy;
    }

    public void update(String title, String description, MaintenanceType taskType,
                       MaintenancePriority priority, LocalDate scheduledDate) {
        if (title != null) this.title = title;
        if (description != null) this.description = description;
        if (taskType != null) this.taskType = taskType;
        if (priority != null) this.priority = priority;
        if (scheduledDate != null) this.scheduledDate = scheduledDate;
    }

    public void assignTo(User user) {
        this.assignee = user;
    }

    public void start() {
        if (this.status != MaintenanceStatus.PENDING) {
            throw new IllegalStateException("PENDING 상태에서만 시작할 수 있습니다.");
        }
        this.status = MaintenanceStatus.IN_PROGRESS;
    }

    public void complete() {
        if (this.status != MaintenanceStatus.IN_PROGRESS) {
            throw new IllegalStateException("IN_PROGRESS 상태에서만 완료할 수 있습니다.");
        }
        this.status = MaintenanceStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (this.status == MaintenanceStatus.COMPLETED) {
            throw new IllegalStateException("완료된 작업은 취소할 수 없습니다.");
        }
        if (this.status == MaintenanceStatus.CANCELLED) {
            throw new IllegalStateException("이미 취소된 작업입니다.");
        }
        this.status = MaintenanceStatus.CANCELLED;
    }
}
