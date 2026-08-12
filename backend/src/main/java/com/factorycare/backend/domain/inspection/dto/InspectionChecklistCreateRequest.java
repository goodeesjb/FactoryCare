package com.factorycare.backend.domain.inspection.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record InspectionChecklistCreateRequest(
    @NotBlank(message = "체크리스트명은 필수입니다.") String name,
    String description,
    Long equipmentTypeId,
    @NotEmpty(message = "점검 항목은 1개 이상 필요합니다.") List<String> itemNames
) {}