package com.factorycare.backend.domain.inspection.dto;

import java.util.List;

public record InspectionChecklistUpdateRequest(
    String name, String description,
    Long equipmentTypeId,
    List<String> itemNames
) {}