package com.factorycare.backend.domain.user.dto;

import com.factorycare.backend.domain.user.entity.UserRole;
import jakarta.validation.constraints.NotNull;

public record UserRoleUpdateRequest(
        @NotNull UserRole role
) {}
