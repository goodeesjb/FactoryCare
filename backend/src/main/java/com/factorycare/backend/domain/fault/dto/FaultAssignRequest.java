package com.factorycare.backend.domain.fault.dto;

import jakarta.validation.constraints.NotNull;

public record FaultAssignRequest(@NotNull Long assigneeId) {}
