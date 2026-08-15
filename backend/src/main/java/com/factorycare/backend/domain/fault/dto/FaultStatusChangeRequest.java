package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultStatus;
import jakarta.validation.constraints.NotNull;

public record FaultStatusChangeRequest(@NotNull FaultStatus status, String reason) {}
