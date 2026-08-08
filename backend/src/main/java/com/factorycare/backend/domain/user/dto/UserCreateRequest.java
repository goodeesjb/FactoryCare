package com.factorycare.backend.domain.user.dto;

import com.factorycare.backend.domain.user.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank(message = "로그인 ID를 입력하세요.") @Size(min = 4, max = 50) String loginId,
        @NotBlank(message = "비밀번호를 입력하세요.") @Size(min = 8) String password,
        @NotBlank(message = "이름을 입력하세요.") String name,
        @NotNull(message = "역할을 선택하세요.") UserRole role
) {}
