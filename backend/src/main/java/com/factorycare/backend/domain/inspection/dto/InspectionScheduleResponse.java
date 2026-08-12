package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleType;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InspectionScheduleResponse(
    Long id,
    Long equipmentId, String equipmentName,
    Long checklistId, String checklistName,
    Long assigneeId, String assigneeName,
    LocalDate scheduledDate,
    InspectionScheduleType inspectionType,
    InspectionScheduleStatus status,
    String description,
    LocalDateTime createdAt
) {
    public static InspectionScheduleResponse from(InspectionSchedule s) {
        return new InspectionScheduleResponse(
            s.getId(),
            s.getEquipment().getId(), s.getEquipment().getName(),
            s.getChecklist().getId(), s.getChecklist().getName(),
            s.getAssignee().getId(), s.getAssignee().getName(),
            s.getScheduledDate(), s.getInspectionType(), s.getStatus(),
            s.getDescription(), s.getCreatedAt()
        );
    }
}