package com.factorycare.backend.domain.user.repository;

import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    UserRepository userRepository;

    @Test
    @DisplayName("loginId로 사용자 조회")
    void findByLoginId() {
        User user = User.builder()
                .loginId("admin01")
                .password("encoded_pw")
                .name("관리자")
                .role(UserRole.ADMIN)
                .build();
        userRepository.save(user);

        assertThat(userRepository.findByLoginId("admin01")).isPresent();
        assertThat(userRepository.findByLoginId("없음")).isEmpty();
    }

    @Test
    @DisplayName("refreshToken으로 사용자 조회")
    void findByRefreshToken() {
        User user = User.builder()
                .loginId("worker01")
                .password("pw")
                .name("작업자")
                .role(UserRole.WORKER)
                .build();
        user.updateRefreshToken("sample_refresh_token");
        userRepository.save(user);

        assertThat(userRepository.findByRefreshToken("sample_refresh_token")).isPresent();
    }
}