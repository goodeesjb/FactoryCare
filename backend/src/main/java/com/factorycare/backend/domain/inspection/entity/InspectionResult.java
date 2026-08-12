package com.factorycare.backend.domain.inspection.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inspection_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InspectionResult {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    private Inspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_item_id", nullable = false)
    private InspectionChecklistItem checklistItem;

    @Column(nullable = false, length = 100)
    private String itemName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionResultValue result;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false)
    private boolean needsFaultReport = false;

    @Builder
    public InspectionResult(Inspection inspection, InspectionChecklistItem checklistItem,
                             String itemName, InspectionResultValue result, String note) {
        this.inspection = inspection;
        this.checklistItem = checklistItem;
        this.itemName = itemName;
        this.result = result;
        this.note = note;
        this.needsFaultReport = result == InspectionResultValue.FAIL;
    }
}
