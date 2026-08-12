package com.factorycare.backend.domain.inspection.entity;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inspection_checklists")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class InspectionChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_type_id")
    private EquipmentType equipmentType;

    @OneToMany(mappedBy = "checklist", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("itemOrder ASC")
    private List<InspectionChecklistItem> items = new ArrayList<>();

    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public InspectionChecklist(String name, String description, EquipmentType equipmentType) {
        this.name = name;
        this.description = description;
        this.equipmentType = equipmentType;
    }

    public void update(String name, String description, EquipmentType equipmentType) {
        if (name != null) this.name = name;
        if (description != null) this.description = description;
        this.equipmentType = equipmentType;
    }

    public void replaceItems(List<InspectionChecklistItem> newItems) {
        this.items.clear();
        this.items.addAll(newItems);
    }

    public void deactivate() { this.active = false; }
}