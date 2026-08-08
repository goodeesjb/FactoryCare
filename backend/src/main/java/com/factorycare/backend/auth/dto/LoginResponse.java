package com.factorycare.backend.auth.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String role,
        String name
) {}
