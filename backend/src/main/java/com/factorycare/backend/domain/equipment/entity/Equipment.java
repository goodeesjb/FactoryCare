package com.factorycare.backend.domain.equipment.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "equipments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String equipmentNo;

    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_id")
    private EquipmentType type;

    @Column(length = 100)
    private String manufacturer;

    @Column(length = 100)
    private String modelName;

    private LocalDate installedAt;

    @Column(length = 100)
    private String location;

    @Column(length = 100)
    private String department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus status = EquipmentStatus.NORMAL;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public Equipment(String equipmentNo, String name, EquipmentType type, String manufacturer,
                     String modelName, LocalDate installedAt, String location, String department,
                     User assignee, String description) {
        this.equipmentNo = equipmentNo;
        this.name = name;
        this.type = type;
        this.manufacturer = manufacturer;
        this.modelName = modelName;
        this.installedAt = installedAt;
        this.location = location;
        this.department = department;
        this.assignee = assignee;
        this.description = description;
    }

    public void update(String name, EquipmentType type, String manufacturer, String modelName,
                       LocalDate installedAt, String location, String department,
                       User assignee, String description) {
        if (name != null) this.name = name;
        if (type != null) this.type = type;
        if (manufacturer != null) this.manufacturer = manufacturer;
        if (modelName != null) this.modelName = modelName;
        if (installedAt != null) this.installedAt = installedAt;
        if (location != null) this.location = location;
        if (department != null) this.department = department;
        if (assignee != null) this.assignee = assignee;
        if (description != null) this.description = description;
    }

    public void changeStatus(EquipmentStatus newStatus) {
        this.status = newStatus;
    }

    public void deactivate() {
        this.active = false;
    }
}
