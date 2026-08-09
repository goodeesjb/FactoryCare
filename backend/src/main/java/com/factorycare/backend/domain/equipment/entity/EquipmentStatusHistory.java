package com.factorycare.backend.domain.equipment.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "equipment_status_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EquipmentStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus newStatus;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime changedAt;

    @Builder
    public EquipmentStatusHistory(Equipment equipment, User changedBy,
                                   EquipmentStatus previousStatus, EquipmentStatus newStatus,
                                   String reason) {
        this.equipment = equipment;
        this.changedBy = changedBy;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.reason = reason;
        this.changedAt = LocalDateTime.now();
    }
}
