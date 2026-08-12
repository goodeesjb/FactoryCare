package com.factorycare.backend.domain.inspection.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inspection_checklist_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InspectionChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    private InspectionChecklist checklist;

    @Column(nullable = false, length = 100)
    private String itemName;

    @Column(nullable = false)
    private int itemOrder;

    @Builder
    public InspectionChecklistItem(InspectionChecklist checklist, String itemName, int itemOrder) {
        this.checklist = checklist;
        this.itemName = itemName;
        this.itemOrder = itemOrder;
    }
}