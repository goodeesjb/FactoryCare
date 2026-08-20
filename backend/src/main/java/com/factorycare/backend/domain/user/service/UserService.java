package com.factorycare.backend.domain.user.service;

import com.factorycare.backend.domain.user.dto.UserCreateRequest;
import com.factorycare.backend.domain.user.dto.UserResponse;
import com.factorycare.backend.domain.user.dto.UserUpdateRequest;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        return UserResponse.from(getUser(id));
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        if (userRepository.existsByLoginId(request.loginId())) {
            throw new IllegalStateException("이미 사용 중인 로그인 ID입니다.");
        }
        User user = User.builder()
                .loginId(request.loginId())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .role(request.role())
                .build();
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = getUser(id);
        if (StringUtils.hasText(request.name())) {
            user.updateProfile(request.name());
        }
        if (StringUtils.hasText(request.password())) {
            user.changePassword(passwordEncoder.encode(request.password()));
        }
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse changeRole(Long id, UserRole role) {
        User user = getUser(id);
        user.changeRole(role);
        return UserResponse.from(user);
    }

    @Transactional
    public void deactivate(Long id) {
        getUser(id).deactivate();
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
