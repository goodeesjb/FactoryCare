package com.factorycare.backend.domain.user.controller;

import com.factorycare.backend.domain.user.dto.UserCreateRequest;
import com.factorycare.backend.domain.user.dto.UserResponse;
import com.factorycare.backend.domain.user.dto.UserRoleUpdateRequest;
import com.factorycare.backend.domain.user.dto.UserUpdateRequest;
import com.factorycare.backend.domain.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        UserResponse response = userService.create(request);
        return ResponseEntity.created(URI.create("/api/users/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or principal.equals(#id)")
    public ResponseEntity<UserResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or principal.equals(#id)")
    public ResponseEntity<UserResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> changeRole(@PathVariable Long id,
                                                    @Valid @RequestBody UserRoleUpdateRequest request) {
        return ResponseEntity.ok(userService.changeRole(id, request.role()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        userService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
