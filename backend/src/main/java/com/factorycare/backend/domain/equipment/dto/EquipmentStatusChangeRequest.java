package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EquipmentStatusChangeRequest(
        @NotNull(message = "변경할 상태는 필수입니다.") EquipmentStatus newStatus,
        @NotBlank(message = "변경 사유는 필수입니다.") String reason
) {}
