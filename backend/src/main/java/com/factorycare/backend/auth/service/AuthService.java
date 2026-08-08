package com.factorycare.backend.auth.service;

import com.factorycare.backend.auth.dto.LoginRequest;
import com.factorycare.backend.auth.dto.LoginResponse;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.security.CustomUserDetails;
import com.factorycare.backend.security.JwtProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       JwtProvider jwtProvider) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtProvider = jwtProvider;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.loginId(), request.password())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId());
        user.updateRefreshToken(refreshToken);

        return new LoginResponse(accessToken, refreshToken, user.getRole().name(), user.getName());
    }

    @Transactional
    public LoginResponse refresh(String refreshToken) {
        if (!jwtProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 Refresh Token입니다.");
        }

        User user = userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new IllegalArgumentException("Refresh Token이 일치하지 않습니다."));

        String newAccessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole());
        String newRefreshToken = jwtProvider.generateRefreshToken(user.getId());
        user.updateRefreshToken(newRefreshToken);

        return new LoginResponse(newAccessToken, newRefreshToken, user.getRole().name(), user.getName());
    }

    @Transactional
    public void logout(Long userId) {
        userRepository.findById(userId).ifPresentOrElse(
                u -> u.updateRefreshToken(null),
                () -> log.warn("logout called for unknown userId={}", userId)
        );
    }
}
