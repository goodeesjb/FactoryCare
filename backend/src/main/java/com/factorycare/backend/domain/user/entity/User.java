package com.factorycare.backend.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String loginId;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(length = 512)
    private String refreshToken;

    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public User(String loginId, String password, String name, UserRole role) {
        this.loginId = loginId;
        this.password = password;
        this.name = name;
        this.role = role;
    }

    public void updateRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public void updateProfile(String name) {
        this.name = name;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void changeRole(UserRole role) {
        this.role = role;
    }

    public void deactivate() {
        this.active = false;
    }
}