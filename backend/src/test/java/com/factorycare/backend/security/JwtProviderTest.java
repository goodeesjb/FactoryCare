package com.factorycare.backend.security;

import com.factorycare.backend.domain.user.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtProviderTest {

    JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.setSecret("TestSecretKeyForFactoryCare2026TestSecretKeyForFactoryCare2026");
        props.setAccessTokenExpiration(1800000L);
        props.setRefreshTokenExpiration(604800000L);

        jwtProvider = new JwtProvider(props);
        jwtProvider.init();
    }

    @Test
    @DisplayName("Access Token 생성 후 userId/role 파싱")
    void generateAndParseAccessToken() {
        String token = jwtProvider.generateAccessToken(1L, UserRole.ADMIN);

        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getUserId(token)).isEqualTo(1L);
        assertThat(jwtProvider.getRole(token)).isEqualTo(UserRole.ADMIN);
    }

    @Test
    @DisplayName("위조된 토큰은 validateToken false 반환")
    void invalidTokenReturnsFalse() {
        assertThat(jwtProvider.validateToken("invalid.token.here")).isFalse();
    }

    @Test
    @DisplayName("Refresh Token 생성 후 userId 파싱")
    void generateRefreshToken() {
        String token = jwtProvider.generateRefreshToken(5L);

        assertThat(jwtProvider.validateToken(token)).isTrue();
        assertThat(jwtProvider.getUserId(token)).isEqualTo(5L);
    }
}
