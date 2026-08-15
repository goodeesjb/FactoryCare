package com.factorycare.backend.domain.fault.entity;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "faults")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Fault {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultStatus status = FaultStatus.REPORTED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_id", nullable = false)
    private User reportedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_result_id")
    private InspectionResult inspectionResult;

    @OneToMany(mappedBy = "fault", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("changedAt ASC")
    private List<FaultStatusHistory> statusHistories = new ArrayList<>();

    private LocalDateTime resolvedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Fault(Equipment equipment, String title, String description,
                 FaultSeverity severity, User reportedBy, InspectionResult inspectionResult) {
        this.equipment = equipment;
        this.title = title;
        this.description = description;
        this.severity = severity != null ? severity : FaultSeverity.MEDIUM;
        this.reportedBy = reportedBy;
        this.inspectionResult = inspectionResult;
    }

    public void update(String title, String description, FaultSeverity severity) {
        if (title != null) this.title = title;
        if (description != null) this.description = description;
        if (severity != null) this.severity = severity;
    }

    public void changeStatus(FaultStatus newStatus) {
        validateTransition(this.status, newStatus);
        if (newStatus == FaultStatus.RESOLVED) {
            this.resolvedAt = LocalDateTime.now();
        }
        this.status = newStatus;
    }

    public void assignTo(User user) {
        this.assignedTo = user;
    }

    private void validateTransition(FaultStatus from, FaultStatus to) {
        boolean valid = switch (from) {
            case REPORTED -> to == FaultStatus.CONFIRMED;
            case CONFIRMED -> to == FaultStatus.IN_PROGRESS;
            case IN_PROGRESS -> to == FaultStatus.RESOLVED;
            case RESOLVED -> to == FaultStatus.CLOSED || to == FaultStatus.IN_PROGRESS;
            case CLOSED -> false;
        };
        if (!valid) throw new IllegalStateException(from + " → " + to + " 상태 전이 불가");
    }
}