package com.factorycare.backend.domain.user.dto;

import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String loginId,
        String name,
        UserRole role,
        boolean active,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getLoginId(),
                user.getName(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt()
        );
    }
}
