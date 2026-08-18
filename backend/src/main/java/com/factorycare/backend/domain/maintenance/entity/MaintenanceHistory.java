package com.factorycare.backend.domain.maintenance.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "maintenance_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_task_id", nullable = false)
    private MaintenanceTask maintenanceTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by_id", nullable = false)
    private User recordedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenanceHistoryType type;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private Integer durationMinutes;

    @Column(nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();

    @Builder
    public MaintenanceHistory(MaintenanceTask maintenanceTask, User recordedBy,
                              MaintenanceHistoryType type, String content,
                              Integer durationMinutes) {
        this.maintenanceTask = maintenanceTask;
        this.recordedBy = recordedBy;
        this.type = type;
        this.content = content;
        this.durationMinutes = durationMinutes;
    }
}
