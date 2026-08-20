package com.factorycare.backend.domain.part.entity;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "part_usages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PartUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_task_id", nullable = false)
    private MaintenanceTask maintenanceTask;

    @Column(nullable = false)
    private int quantity;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_by_id", nullable = false)
    private User usedBy;

    @Column(nullable = false)
    private LocalDateTime usedAt = LocalDateTime.now();

    @Builder
    public PartUsage(Part part, MaintenanceTask maintenanceTask,
                     int quantity, String note, User usedBy) {
        this.part = part;
        this.maintenanceTask = maintenanceTask;
        this.quantity = quantity;
        this.note = note;
        this.usedBy = usedBy;
    }
}
