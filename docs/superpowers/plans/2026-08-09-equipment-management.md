# 설비관리 (WBS 4.0~4.3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설비유형 관리, 설비 CRUD + 동적 검색(QueryDSL), 상태변경 이력 추적 기능을 백엔드 우선으로 구현하고 React 화면 완성.

**Architecture:** Backend 완성 후 Frontend 순차 구현. QueryDSL로 동적 필터 + 페이징, Soft delete, 상태변경 시 이력 자동 기록. 기존 `domain/user` 패턴 동일 적용.

**Tech Stack:** Java 21, Spring Boot 4.1, Spring Security + JWT, Spring Data JPA + QueryDSL 5.1.0, H2(테스트), MariaDB(운영), React + TypeScript + TanStack Query + Tailwind CSS

## Global Constraints

- 패키지 루트: `com.factorycare.backend`
- 모든 DTO는 Java record 사용
- 서비스/컨트롤러 의존성 주입: 생성자 주입 (no `@Autowired`)
- 테스트 임포트: Spring Boot 4.x 경로 사용 (`tools.jackson.databind.ObjectMapper`, `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`, `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest`)
- JWT principal: `Long userId` (`JwtAuthenticationFilter`에서 `UsernamePasswordAuthenticationToken`의 principal로 설정)
- `@PreAuthorize` 역할: `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_WORKER`
- Soft delete: `active` boolean 플래그
- 스펙: `docs/superpowers/specs/2026-08-09-equipment-management-design.md`

---

## 파일 맵

**신규 생성 (Backend)**
```
domain/equipment/entity/
  EquipmentStatus.java               — 상태 Enum (5가지)
  EquipmentType.java                 — 설비유형 엔티티
  Equipment.java                     — 설비 엔티티
  EquipmentStatusHistory.java        — 상태변경 이력 엔티티

domain/equipment/repository/
  EquipmentTypeRepository.java       — 설비유형 JPA 레포
  EquipmentRepositoryCustom.java     — QueryDSL 커스텀 인터페이스
  EquipmentRepositoryImpl.java       — QueryDSL 구현체
  EquipmentRepository.java           — 메인 레포 (JPA + Custom)
  EquipmentStatusHistoryRepository.java

domain/equipment/dto/
  EquipmentTypeCreateRequest.java
  EquipmentTypeUpdateRequest.java
  EquipmentTypeResponse.java
  EquipmentSearchCondition.java      — QueryDSL 검색 조건
  EquipmentCreateRequest.java
  EquipmentUpdateRequest.java
  EquipmentResponse.java
  EquipmentStatusChangeRequest.java
  EquipmentStatusHistoryResponse.java

domain/equipment/service/
  EquipmentTypeService.java
  EquipmentService.java

domain/equipment/controller/
  EquipmentTypeController.java
  EquipmentController.java
```

**수정 (Backend)**
```
backend/build.gradle                 — QueryDSL 의존성 추가
global/config/JpaConfig.java         — JPAQueryFactory Bean 추가
```

**신규 생성 (테스트)**
```
test/.../equipment/EquipmentTypeControllerTest.java
test/.../equipment/EquipmentControllerTest.java
test/.../equipment/repository/EquipmentRepositoryTest.java
```

**신규 생성 (Frontend)**
```
frontend/src/types/equipment.ts
frontend/src/api/equipment.ts
frontend/src/pages/equipment/EquipmentListPage.tsx
frontend/src/pages/equipment/EquipmentFormPage.tsx
frontend/src/pages/equipment/EquipmentDetailPage.tsx
frontend/src/components/equipment/StatusChangeModal.tsx
```

**수정 (Frontend)**
```
frontend/src/router/index.tsx        — 설비 관련 라우트 추가
```

---

### Task 1: QueryDSL 의존성 설정

**Files:**
- Modify: `backend/build.gradle`
- Modify: `backend/src/main/java/com/factorycare/backend/global/config/JpaConfig.java`

**Interfaces:**
- Produces: `JPAQueryFactory` Bean — Task 3의 `EquipmentRepositoryImpl`이 생성자 주입으로 사용

- [ ] **Step 1: build.gradle에 QueryDSL 의존성 추가**

`dependencies {}` 블록 내에 추가:
```groovy
implementation 'com.querydsl:querydsl-jpa:5.1.0:jakarta'
annotationProcessor 'com.querydsl:querydsl-apt:5.1.0:jakarta'
annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
annotationProcessor 'jakarta.persistence:jakarta.persistence-api'
```

- [ ] **Step 2: JpaConfig에 JPAQueryFactory Bean 추가**

`JpaConfig.java` 전체를 다음으로 교체:
```java
package com.factorycare.backend.global.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing
public class JpaConfig {

    @PersistenceContext
    private EntityManager em;

    @Bean
    public JPAQueryFactory jpaQueryFactory() {
        return new JPAQueryFactory(em);
    }
}
```

- [ ] **Step 3: 컴파일 확인**

```bash
cd backend
./gradlew compileJava
```
Expected: `BUILD SUCCESSFUL` (Q클래스는 아직 없어도 됨 — Task 3에서 엔티티 생성 후 자동 생성)

- [ ] **Step 4: 커밋**

```bash
git add backend/build.gradle backend/src/main/java/com/factorycare/backend/global/config/JpaConfig.java
git commit -m "chore(querydsl): QueryDSL 5.1.0 의존성 추가 및 JPAQueryFactory Bean 설정"
```

---

### Task 2: EquipmentType 백엔드 (Entity → Service → Controller)

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/equipment/entity/EquipmentType.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/equipment/repository/EquipmentTypeRepository.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/equipment/dto/EquipmentTypeCreateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/equipment/dto/EquipmentTypeUpdateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/equipment/dto/EquipmentTypeResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/equipment/service/EquipmentTypeService.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/equipment/controller/EquipmentTypeController.java`
- Test: `backend/src/test/java/com/factorycare/backend/domain/equipment/EquipmentTypeControllerTest.java`

**Interfaces:**
- Produces: `EquipmentType` 엔티티, `EquipmentTypeResponse.from(EquipmentType)` — Task 3의 `Equipment` 엔티티가 FK로 참조

- [ ] **Step 1: EquipmentType 엔티티 생성**

```java
// backend/src/main/java/com/factorycare/backend/domain/equipment/entity/EquipmentType.java
package com.factorycare.backend.domain.equipment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "equipment_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class EquipmentType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 255)
    private String description;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public EquipmentType(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public void update(String name, String description) {
        if (name != null) this.name = name;
        if (description != null) this.description = description;
    }
}
```

- [ ] **Step 2: EquipmentTypeRepository 생성**

```java
// backend/src/main/java/com/factorycare/backend/domain/equipment/repository/EquipmentTypeRepository.java
package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentTypeRepository extends JpaRepository<EquipmentType, Long> {
    boolean existsByName(String name);
}
```

- [ ] **Step 3: DTO 3개 생성**

```java
// EquipmentTypeCreateRequest.java
package com.factorycare.backend.domain.equipment.dto;

import jakarta.validation.constraints.NotBlank;

public record EquipmentTypeCreateRequest(
        @NotBlank(message = "유형명은 필수입니다.") String name,
        String description
) {}
```

```java
// EquipmentTypeUpdateRequest.java
package com.factorycare.backend.domain.equipment.dto;

public record EquipmentTypeUpdateRequest(
        String name,
        String description
) {}
```

```java
// EquipmentTypeResponse.java
package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;

public record EquipmentTypeResponse(Long id, String name, String description) {
    public static EquipmentTypeResponse from(EquipmentType type) {
        return new EquipmentTypeResponse(type.getId(), type.getName(), type.getDescription());
    }
}
```

- [ ] **Step 4: EquipmentTypeService 생성**

```java
// backend/src/main/java/com/factorycare/backend/domain/equipment/service/EquipmentTypeService.java
package com.factorycare.backend.domain.equipment.service;

import com.factorycare.backend.domain.equipment.dto.EquipmentTypeCreateRequest;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeResponse;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeUpdateRequest;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EquipmentTypeService {

    private final EquipmentTypeRepository equipmentTypeRepository;

    public EquipmentTypeService(EquipmentTypeRepository equipmentTypeRepository) {
        this.equipmentTypeRepository = equipmentTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<EquipmentTypeResponse> findAll() {
        return equipmentTypeRepository.findAll().stream()
                .map(EquipmentTypeResponse::from)
                .toList();
    }

    @Transactional
    public EquipmentTypeResponse create(EquipmentTypeCreateRequest request) {
        if (equipmentTypeRepository.existsByName(request.name())) {
            throw new IllegalStateException("이미 사용 중인 유형명입니다.");
        }
        EquipmentType type = EquipmentType.builder()
                .name(request.name())
                .description(request.description())
                .build();
        return EquipmentTypeResponse.from(equipmentTypeRepository.save(type));
    }

    @Transactional
    public EquipmentTypeResponse update(Long id, EquipmentTypeUpdateRequest request) {
        EquipmentType type = getEquipmentType(id);
        type.update(request.name(), request.description());
        return EquipmentTypeResponse.from(type);
    }

    @Transactional
    public void delete(Long id) {
        EquipmentType type = getEquipmentType(id);
        if (equipmentTypeRepository.isUsedByEquipment(id)) {
            throw new IllegalStateException("사용 중인 설비유형은 삭제할 수 없습니다.");
        }
        equipmentTypeRepository.delete(type);
    }

    public EquipmentType getEquipmentType(Long id) {
        return equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("설비유형을 찾을 수 없습니다. id=" + id));
    }
}
```

> 참고: `equipmentTypeRepository.isUsedByEquipment(id)`는 Task 3에서 Equipment 엔티티 생성 후 EquipmentTypeRepository에 추가한다. 지금은 `EquipmentTypeRepository`에 아래 메서드를 플레이스홀더로 추가:

```java
// EquipmentTypeRepository에 추가 (Task 3에서 실제 쿼리로 교체)
@Query("SELECT COUNT(e) > 0 FROM Equipment e WHERE e.type.id = :typeId AND e.active = true")
boolean isUsedByEquipment(@Param("typeId") Long typeId);
```

임포트:
```java
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
```

- [ ] **Step 5: EquipmentTypeController 생성**

```java
// backend/src/main/java/com/factorycare/backend/domain/equipment/controller/EquipmentTypeController.java
package com.factorycare.backend.domain.equipment.controller;

import com.factorycare.backend.domain.equipment.dto.EquipmentTypeCreateRequest;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeResponse;
import com.factorycare.backend.domain.equipment.dto.EquipmentTypeUpdateRequest;
import com.factorycare.backend.domain.equipment.service.EquipmentTypeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/equipment-types")
public class EquipmentTypeController {

    private final EquipmentTypeService equipmentTypeService;

    public EquipmentTypeController(EquipmentTypeService equipmentTypeService) {
        this.equipmentTypeService = equipmentTypeService;
    }

    @GetMapping
    public ResponseEntity<List<EquipmentTypeResponse>> getAll() {
        return ResponseEntity.ok(equipmentTypeService.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipmentTypeResponse> create(@Valid @RequestBody EquipmentTypeCreateRequest request) {
        EquipmentTypeResponse response = equipmentTypeService.create(request);
        return ResponseEntity.created(URI.create("/api/equipment-types/" + response.id())).body(response);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipmentTypeResponse> update(@PathVariable Long id,
                                                         @RequestBody EquipmentTypeUpdateRequest request) {
        return ResponseEntity.ok(equipmentTypeService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        equipmentTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 6: EquipmentTypeControllerTest 작성 후 실행**

```java
// backend/src/test/java/com/factorycare/backend/domain/equipment/EquipmentTypeControllerTest.java
package com.factorycare.backend.domain.equipment;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.security.JwtProvider;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EquipmentTypeControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken;
    String managerToken;
    String workerToken;

    @BeforeEach
    void setUp() {
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
                .loginId("admin01").password(passwordEncoder.encode("pw")).name("관리자").role(UserRole.ADMIN).build());
        User manager = userRepository.save(User.builder()
                .loginId("manager01").password(passwordEncoder.encode("pw")).name("매니저").role(UserRole.MANAGER).build());
        User worker = userRepository.save(User.builder()
                .loginId("worker01").password(passwordEncoder.encode("pw")).name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);
    }

    @Test
    @DisplayName("전체 역할이 유형 목록 조회 가능")
    void getAll() throws Exception {
        equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").description("다관절 로봇").build());

        mockMvc.perform(get("/api/equipment-types").header("Authorization", workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("로봇암"));
    }

    @Test
    @DisplayName("ADMIN이 유형 생성 → 201")
    void create_asAdmin() throws Exception {
        var body = Map.of("name", "컨베이어", "description", "컨베이어 벨트");

        mockMvc.perform(post("/api/equipment-types")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("컨베이어"));
    }

    @Test
    @DisplayName("MANAGER가 유형 생성 → 403")
    void create_asManager_403() throws Exception {
        var body = Map.of("name", "컨베이어");

        mockMvc.perform(post("/api/equipment-types")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("중복 유형명 생성 → 409")
    void create_duplicateName_409() throws Exception {
        equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        var body = Map.of("name", "로봇암");

        mockMvc.perform(post("/api/equipment-types")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("ADMIN이 유형 수정")
    void update_asAdmin() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        var body = Map.of("name", "산업용 로봇");

        mockMvc.perform(patch("/api/equipment-types/" + type.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("산업용 로봇"));
    }

    @Test
    @DisplayName("ADMIN이 유형 삭제")
    void delete_asAdmin() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("임시유형").build());

        mockMvc.perform(delete("/api/equipment-types/" + type.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }
}
```

Run:
```bash
./gradlew test --tests "com.factorycare.backend.domain.equipment.EquipmentTypeControllerTest"
```
Expected: 5 tests PASS

- [ ] **Step 7: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/equipment/ \
        backend/src/test/java/com/factorycare/backend/domain/equipment/EquipmentTypeControllerTest.java
git commit -m "feat(equipment-type): 설비유형 CRUD API 구현"
```

---

### Task 3: Equipment 엔티티 + QueryDSL 레포지토리

**Files:**
- Create: `domain/equipment/entity/EquipmentStatus.java`
- Create: `domain/equipment/entity/Equipment.java`
- Create: `domain/equipment/dto/EquipmentSearchCondition.java`
- Create: `domain/equipment/repository/EquipmentRepositoryCustom.java`
- Create: `domain/equipment/repository/EquipmentRepositoryImpl.java`
- Create: `domain/equipment/repository/EquipmentRepository.java`
- Test: `test/.../equipment/repository/EquipmentRepositoryTest.java`

**Interfaces:**
- Consumes: `EquipmentType` (Task 2), `User` (기존)
- Produces: `EquipmentRepository.search(EquipmentSearchCondition, Pageable) → Page<Equipment>` — Task 4 Service가 사용

- [ ] **Step 1: EquipmentStatus Enum 생성**

```java
// domain/equipment/entity/EquipmentStatus.java
package com.factorycare.backend.domain.equipment.entity;

public enum EquipmentStatus {
    NORMAL,            // 정상
    INSPECTION_NEEDED, // 점검필요
    BROKEN,            // 고장
    REPAIRING,         // 수리중
    DISCARDED          // 폐기
}
```

- [ ] **Step 2: Equipment 엔티티 생성**

```java
// domain/equipment/entity/Equipment.java
package com.factorycare.backend.domain.equipment.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "equipments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String equipmentNo;

    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_id")
    private EquipmentType type;

    @Column(length = 100)
    private String manufacturer;

    @Column(length = 100)
    private String modelName;

    private LocalDate installedAt;

    @Column(length = 100)
    private String location;

    @Column(length = 100)
    private String department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus status = EquipmentStatus.NORMAL;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Builder
    public Equipment(String equipmentNo, String name, EquipmentType type, String manufacturer,
                     String modelName, LocalDate installedAt, String location, String department,
                     User assignee, String description) {
        this.equipmentNo = equipmentNo;
        this.name = name;
        this.type = type;
        this.manufacturer = manufacturer;
        this.modelName = modelName;
        this.installedAt = installedAt;
        this.location = location;
        this.department = department;
        this.assignee = assignee;
        this.description = description;
    }

    public void update(String name, EquipmentType type, String manufacturer, String modelName,
                       LocalDate installedAt, String location, String department,
                       User assignee, String description) {
        if (name != null) this.name = name;
        if (type != null) this.type = type;
        if (manufacturer != null) this.manufacturer = manufacturer;
        if (modelName != null) this.modelName = modelName;
        if (installedAt != null) this.installedAt = installedAt;
        if (location != null) this.location = location;
        if (department != null) this.department = department;
        if (assignee != null) this.assignee = assignee;
        if (description != null) this.description = description;
    }

    public void changeStatus(EquipmentStatus newStatus) {
        this.status = newStatus;
    }

    public void deactivate() {
        this.active = false;
    }
}
```

- [ ] **Step 3: EquipmentSearchCondition 생성**

```java
// domain/equipment/dto/EquipmentSearchCondition.java
package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;

public record EquipmentSearchCondition(
        String equipmentNo,
        String name,
        Long typeId,
        EquipmentStatus status,
        String location,
        Long assigneeId
) {}
```

- [ ] **Step 4: QueryDSL 커스텀 인터페이스 + 구현체 생성**

```java
// repository/EquipmentRepositoryCustom.java
package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.dto.EquipmentSearchCondition;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EquipmentRepositoryCustom {
    Page<Equipment> search(EquipmentSearchCondition condition, Pageable pageable);
}
```

```java
// repository/EquipmentRepositoryImpl.java
package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.dto.EquipmentSearchCondition;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.QEquipment;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

public class EquipmentRepositoryImpl implements EquipmentRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public EquipmentRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<Equipment> search(EquipmentSearchCondition cond, Pageable pageable) {
        QEquipment eq = QEquipment.equipment;

        List<Equipment> content = queryFactory
                .selectFrom(eq)
                .where(
                        eq.active.isTrue(),
                        equipmentNoContains(eq, cond.equipmentNo()),
                        nameContains(eq, cond.name()),
                        typeEq(eq, cond.typeId()),
                        statusEq(eq, cond.status()),
                        locationContains(eq, cond.location()),
                        assigneeEq(eq, cond.assigneeId())
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(eq.count())
                .from(eq)
                .where(
                        eq.active.isTrue(),
                        equipmentNoContains(eq, cond.equipmentNo()),
                        nameContains(eq, cond.name()),
                        typeEq(eq, cond.typeId()),
                        statusEq(eq, cond.status()),
                        locationContains(eq, cond.location()),
                        assigneeEq(eq, cond.assigneeId())
                )
                .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentNoContains(QEquipment eq, String equipmentNo) {
        return StringUtils.hasText(equipmentNo) ? eq.equipmentNo.containsIgnoreCase(equipmentNo) : null;
    }

    private BooleanExpression nameContains(QEquipment eq, String name) {
        return StringUtils.hasText(name) ? eq.name.containsIgnoreCase(name) : null;
    }

    private BooleanExpression typeEq(QEquipment eq, Long typeId) {
        return typeId != null ? eq.type.id.eq(typeId) : null;
    }

    private BooleanExpression statusEq(QEquipment eq, EquipmentStatus status) {
        return status != null ? eq.status.eq(status) : null;
    }

    private BooleanExpression locationContains(QEquipment eq, String location) {
        return StringUtils.hasText(location) ? eq.location.containsIgnoreCase(location) : null;
    }

    private BooleanExpression assigneeEq(QEquipment eq, Long assigneeId) {
        return assigneeId != null ? eq.assignee.id.eq(assigneeId) : null;
    }
}
```

- [ ] **Step 5: EquipmentRepository 생성**

```java
// repository/EquipmentRepository.java
package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EquipmentRepository extends JpaRepository<Equipment, Long>, EquipmentRepositoryCustom {
    boolean existsByEquipmentNo(String equipmentNo);
    Optional<Equipment> findByIdAndActiveTrue(Long id);
}
```

- [ ] **Step 6: Q클래스 생성 확인**

```bash
./gradlew compileJava
```
Expected: `BUILD SUCCESSFUL`. `build/generated/sources/annotationProcessor/` 아래 `QEquipment.java` 생성됨.

- [ ] **Step 7: EquipmentRepositoryTest 작성 후 실행**

```java
// test/.../equipment/repository/EquipmentRepositoryTest.java
package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.dto.EquipmentSearchCondition;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.global.config.JpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class EquipmentRepositoryTest {

    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired UserRepository userRepository;

    private User savedUser() {
        return userRepository.save(User.builder()
                .loginId("worker01").password("pw").name("작업자").role(UserRole.WORKER).build());
    }

    private EquipmentType savedType(String name) {
        return equipmentTypeRepository.save(EquipmentType.builder().name(name).build());
    }

    @Test
    @DisplayName("설비번호 부분검색")
    void searchByEquipmentNo() {
        EquipmentType type = savedType("로봇암");
        User user = savedUser();
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(user).build());
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("컨베이어B").type(type).assignee(user).build());

        EquipmentSearchCondition cond = new EquipmentSearchCondition("EQ-001", null, null, null, null, null);
        Page<Equipment> result = equipmentRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEquipmentNo()).isEqualTo("EQ-001");
    }

    @Test
    @DisplayName("상태 필터 검색")
    void searchByStatus() {
        EquipmentType type = savedType("컨베이어");
        User user = savedUser();
        Equipment eq1 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("설비A").type(type).assignee(user).build());
        Equipment eq2 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("설비B").type(type).assignee(user).build());
        eq1.changeStatus(EquipmentStatus.BROKEN);

        EquipmentSearchCondition cond = new EquipmentSearchCondition(null, null, null, EquipmentStatus.BROKEN, null, null);
        Page<Equipment> result = equipmentRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEquipmentNo()).isEqualTo("EQ-001");
    }

    @Test
    @DisplayName("Soft delete된 설비는 검색에서 제외")
    void softDeleted_notInSearch() {
        EquipmentType type = savedType("로봇암");
        User user = savedUser();
        Equipment eq = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("설비A").type(type).assignee(user).build());
        eq.deactivate();

        Page<Equipment> result = equipmentRepository.search(new EquipmentSearchCondition(null, null, null, null, null, null), PageRequest.of(0, 10));

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("페이징 동작 확인")
    void paging() {
        EquipmentType type = savedType("로봇암");
        User user = savedUser();
        for (int i = 1; i <= 5; i++) {
            equipmentRepository.save(Equipment.builder()
                    .equipmentNo("EQ-00" + i).name("설비" + i).type(type).assignee(user).build());
        }

        Page<Equipment> page0 = equipmentRepository.search(
                new EquipmentSearchCondition(null, null, null, null, null, null),
                PageRequest.of(0, 3));

        assertThat(page0.getContent()).hasSize(3);
        assertThat(page0.getTotalElements()).isEqualTo(5);
        assertThat(page0.getTotalPages()).isEqualTo(2);
    }
}
```

Run:
```bash
./gradlew test --tests "com.factorycare.backend.domain.equipment.repository.EquipmentRepositoryTest"
```
Expected: 4 tests PASS

- [ ] **Step 8: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/equipment/ \
        backend/src/test/java/com/factorycare/backend/domain/equipment/repository/
git commit -m "feat(equipment): Equipment 엔티티 + QueryDSL 동적 검색 레포지토리 구현"
```

---

### Task 4: Equipment CRUD 서비스 + 컨트롤러

**Files:**
- Create: `dto/EquipmentCreateRequest.java`
- Create: `dto/EquipmentUpdateRequest.java`
- Create: `dto/EquipmentResponse.java`
- Create: `service/EquipmentService.java`
- Create: `controller/EquipmentController.java`
- Test: `test/.../equipment/EquipmentControllerTest.java`

**Interfaces:**
- Consumes: `EquipmentRepository.search()`, `EquipmentRepository.findByIdAndActiveTrue()` (Task 3), `EquipmentTypeService.getEquipmentType()` (Task 2)
- Produces: `EquipmentService.changeStatus(Long id, EquipmentStatusChangeRequest, Long userId)` — Task 5가 사용

- [ ] **Step 1: EquipmentResponse DTO 생성**

```java
// dto/EquipmentResponse.java
package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.user.dto.UserResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EquipmentResponse(
        Long id,
        String equipmentNo,
        String name,
        EquipmentTypeResponse type,
        String manufacturer,
        String modelName,
        LocalDate installedAt,
        String location,
        String department,
        UserResponse assignee,
        EquipmentStatus status,
        String description,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static EquipmentResponse from(Equipment e) {
        return new EquipmentResponse(
                e.getId(), e.getEquipmentNo(), e.getName(),
                e.getType() != null ? EquipmentTypeResponse.from(e.getType()) : null,
                e.getManufacturer(), e.getModelName(), e.getInstalledAt(),
                e.getLocation(), e.getDepartment(),
                e.getAssignee() != null ? UserResponse.from(e.getAssignee()) : null,
                e.getStatus(), e.getDescription(), e.isActive(),
                e.getCreatedAt(), e.getUpdatedAt()
        );
    }
}
```

- [ ] **Step 2: EquipmentCreateRequest, EquipmentUpdateRequest DTO 생성**

```java
// dto/EquipmentCreateRequest.java
package com.factorycare.backend.domain.equipment.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record EquipmentCreateRequest(
        @NotBlank(message = "설비번호는 필수입니다.") String equipmentNo,
        @NotBlank(message = "설비명은 필수입니다.") String name,
        Long typeId,
        String manufacturer,
        String modelName,
        LocalDate installedAt,
        String location,
        String department,
        Long assigneeId,
        String description
) {}
```

```java
// dto/EquipmentUpdateRequest.java
package com.factorycare.backend.domain.equipment.dto;

import java.time.LocalDate;

public record EquipmentUpdateRequest(
        String name,
        Long typeId,
        String manufacturer,
        String modelName,
        LocalDate installedAt,
        String location,
        String department,
        Long assigneeId,
        String description
) {}
```

- [ ] **Step 3: EquipmentService 생성**

```java
// service/EquipmentService.java
package com.factorycare.backend.domain.equipment.service;

import com.factorycare.backend.domain.equipment.dto.*;
import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.equipment.repository.EquipmentStatusHistoryRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;
    private final EquipmentTypeService equipmentTypeService;
    private final UserRepository userRepository;

    public EquipmentService(EquipmentRepository equipmentRepository,
                            EquipmentTypeService equipmentTypeService,
                            UserRepository userRepository) {
        this.equipmentRepository = equipmentRepository;
        this.equipmentTypeService = equipmentTypeService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<EquipmentResponse> search(EquipmentSearchCondition condition, Pageable pageable) {
        return equipmentRepository.search(condition, pageable).map(EquipmentResponse::from);
    }

    @Transactional(readOnly = true)
    public EquipmentResponse findById(Long id) {
        return EquipmentResponse.from(getEquipment(id));
    }

    @Transactional
    public EquipmentResponse create(EquipmentCreateRequest request) {
        if (equipmentRepository.existsByEquipmentNo(request.equipmentNo())) {
            throw new IllegalStateException("이미 사용 중인 설비번호입니다.");
        }
        EquipmentType type = request.typeId() != null ? equipmentTypeService.getEquipmentType(request.typeId()) : null;
        User assignee = request.assigneeId() != null ? getUser(request.assigneeId()) : null;

        Equipment equipment = Equipment.builder()
                .equipmentNo(request.equipmentNo())
                .name(request.name())
                .type(type)
                .manufacturer(request.manufacturer())
                .modelName(request.modelName())
                .installedAt(request.installedAt())
                .location(request.location())
                .department(request.department())
                .assignee(assignee)
                .description(request.description())
                .build();

        return EquipmentResponse.from(equipmentRepository.save(equipment));
    }

    @Transactional
    public EquipmentResponse update(Long id, EquipmentUpdateRequest request) {
        Equipment equipment = getEquipment(id);
        EquipmentType type = request.typeId() != null ? equipmentTypeService.getEquipmentType(request.typeId()) : null;
        User assignee = request.assigneeId() != null ? getUser(request.assigneeId()) : null;

        equipment.update(request.name(), type, request.manufacturer(), request.modelName(),
                request.installedAt(), request.location(), request.department(), assignee, request.description());

        return EquipmentResponse.from(equipment);
    }

    @Transactional
    public void deactivate(Long id) {
        getEquipment(id).deactivate();
    }

    Equipment getEquipment(Long id) {
        return equipmentRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
```

- [ ] **Step 4: EquipmentController 생성**

```java
// controller/EquipmentController.java
package com.factorycare.backend.domain.equipment.controller;

import com.factorycare.backend.domain.equipment.dto.*;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.service.EquipmentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/equipments")
public class EquipmentController {

    private final EquipmentService equipmentService;

    public EquipmentController(EquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    @GetMapping
    public ResponseEntity<Page<EquipmentResponse>> search(
            @RequestParam(required = false) String equipmentNo,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) Long typeId,
            @RequestParam(required = false) EquipmentStatus status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Long assigneeId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        EquipmentSearchCondition condition = new EquipmentSearchCondition(equipmentNo, name, typeId, status, location, assigneeId);
        return ResponseEntity.ok(equipmentService.search(condition, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<EquipmentResponse> create(@Valid @RequestBody EquipmentCreateRequest request) {
        EquipmentResponse response = equipmentService.create(request);
        return ResponseEntity.created(URI.create("/api/equipments/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipmentResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(equipmentService.findById(id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<EquipmentResponse> update(@PathVariable Long id,
                                                     @RequestBody EquipmentUpdateRequest request) {
        return ResponseEntity.ok(equipmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        equipmentService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 5: EquipmentControllerTest 작성 후 실행 (CRUD 부분)**

```java
// test/.../equipment/EquipmentControllerTest.java
package com.factorycare.backend.domain.equipment;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.security.JwtProvider;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EquipmentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken;
    String managerToken;
    String workerToken;
    User worker;

    @BeforeEach
    void setUp() {
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
                .loginId("admin01").password(passwordEncoder.encode("pw")).name("관리자").role(UserRole.ADMIN).build());
        User manager = userRepository.save(User.builder()
                .loginId("manager01").password(passwordEncoder.encode("pw")).name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
                .loginId("worker01").password(passwordEncoder.encode("pw")).name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);
    }

    @Test
    @DisplayName("MANAGER가 설비 등록 → 201")
    void create_asManager() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        var body = Map.of(
                "equipmentNo", "EQ-001",
                "name", "로봇팔 A",
                "typeId", type.getId(),
                "location", "1공장 A구역",
                "assigneeId", worker.getId()
        );

        mockMvc.perform(post("/api/equipments")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.equipmentNo").value("EQ-001"))
                .andExpect(jsonPath("$.status").value("NORMAL"));
    }

    @Test
    @DisplayName("WORKER가 설비 등록 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of("equipmentNo", "EQ-001", "name", "로봇팔");

        mockMvc.perform(post("/api/equipments")
                        .header("Authorization", workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("설비 목록 필터 검색 — 설비번호 부분검색")
    void search_withEquipmentNoFilter() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());
        equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("컨베이어B").type(type).assignee(worker).build());

        mockMvc.perform(get("/api/equipments").param("equipmentNo", "EQ-001")
                        .header("Authorization", workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].equipmentNo").value("EQ-001"));
    }

    @Test
    @DisplayName("설비 상세 조회")
    void getOne() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        mockMvc.perform(get("/api/equipments/" + eq.getId())
                        .header("Authorization", workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentNo").value("EQ-001"))
                .andExpect(jsonPath("$.type.name").value("로봇암"));
    }

    @Test
    @DisplayName("설비 수정")
    void update_asManager() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        var body = Map.of("name", "로봇팔B", "location", "2공장 B구역");

        mockMvc.perform(patch("/api/equipments/" + eq.getId())
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("로봇팔B"));
    }

    @Test
    @DisplayName("ADMIN이 설비 비활성화")
    void deactivate_asAdmin() throws Exception {
        EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
        Equipment eq = equipmentRepository.save(Equipment.builder()
                .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

        mockMvc.perform(delete("/api/equipments/" + eq.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        // 비활성화 후 조회 → 404
        mockMvc.perform(get("/api/equipments/" + eq.getId())
                        .header("Authorization", workerToken))
                .andExpect(status().isBadRequest());
    }
}
```

Run:
```bash
./gradlew test --tests "com.factorycare.backend.domain.equipment.EquipmentControllerTest"
```
Expected: 6 tests PASS

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/equipment/ \
        backend/src/test/java/com/factorycare/backend/domain/equipment/EquipmentControllerTest.java
git commit -m "feat(equipment): 설비 CRUD API + QueryDSL 검색 서비스/컨트롤러 구현"
```

---

### Task 5: 상태변경 + 이력

**Files:**
- Create: `entity/EquipmentStatusHistory.java`
- Create: `repository/EquipmentStatusHistoryRepository.java`
- Create: `dto/EquipmentStatusChangeRequest.java`
- Create: `dto/EquipmentStatusHistoryResponse.java`
- Modify: `service/EquipmentService.java` — `changeStatus()`, `getStatusHistories()` 추가
- Modify: `controller/EquipmentController.java` — `PATCH /{id}/status`, `GET /{id}/status-histories` 추가

**Interfaces:**
- Consumes: `EquipmentService.getEquipment()` (Task 4 — package-private 접근), `UserRepository` (기존)
- Produces: `PATCH /api/equipments/{id}/status`, `GET /api/equipments/{id}/status-histories`

- [ ] **Step 1: EquipmentStatusHistory 엔티티 생성**

```java
// entity/EquipmentStatusHistory.java
package com.factorycare.backend.domain.equipment.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "equipment_status_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EquipmentStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus newStatus;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime changedAt;

    @Builder
    public EquipmentStatusHistory(Equipment equipment, User changedBy,
                                   EquipmentStatus previousStatus, EquipmentStatus newStatus,
                                   String reason) {
        this.equipment = equipment;
        this.changedBy = changedBy;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.reason = reason;
        this.changedAt = LocalDateTime.now();
    }
}
```

- [ ] **Step 2: EquipmentStatusHistoryRepository 생성**

```java
// repository/EquipmentStatusHistoryRepository.java
package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EquipmentStatusHistoryRepository extends JpaRepository<EquipmentStatusHistory, Long> {
    List<EquipmentStatusHistory> findByEquipmentOrderByChangedAtDesc(Equipment equipment);
}
```

- [ ] **Step 3: 상태변경 DTO 2개 생성**

```java
// dto/EquipmentStatusChangeRequest.java
package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EquipmentStatusChangeRequest(
        @NotNull(message = "변경할 상태는 필수입니다.") EquipmentStatus newStatus,
        @NotBlank(message = "변경 사유는 필수입니다.") String reason
) {}
```

```java
// dto/EquipmentStatusHistoryResponse.java
package com.factorycare.backend.domain.equipment.dto;

import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatusHistory;

import java.time.LocalDateTime;

public record EquipmentStatusHistoryResponse(
        Long id,
        EquipmentStatus previousStatus,
        EquipmentStatus newStatus,
        String reason,
        String changedByName,
        LocalDateTime changedAt
) {
    public static EquipmentStatusHistoryResponse from(EquipmentStatusHistory h) {
        return new EquipmentStatusHistoryResponse(
                h.getId(), h.getPreviousStatus(), h.getNewStatus(),
                h.getReason(), h.getChangedBy().getName(), h.getChangedAt()
        );
    }
}
```

- [ ] **Step 4: EquipmentService에 changeStatus + getStatusHistories 추가**

`EquipmentService` 클래스에 필드와 메서드 추가. 생성자에 `EquipmentStatusHistoryRepository` 추가:

```java
// 필드 추가
private final EquipmentStatusHistoryRepository statusHistoryRepository;

// 생성자 교체
public EquipmentService(EquipmentRepository equipmentRepository,
                        EquipmentTypeService equipmentTypeService,
                        UserRepository userRepository,
                        EquipmentStatusHistoryRepository statusHistoryRepository) {
    this.equipmentRepository = equipmentRepository;
    this.equipmentTypeService = equipmentTypeService;
    this.userRepository = userRepository;
    this.statusHistoryRepository = statusHistoryRepository;
}

// 메서드 추가
@Transactional
public EquipmentResponse changeStatus(Long id, EquipmentStatusChangeRequest request, Long changedById) {
    Equipment equipment = getEquipment(id);
    User changedBy = getUser(changedById);
    EquipmentStatus previousStatus = equipment.getStatus();

    equipment.changeStatus(request.newStatus());

    statusHistoryRepository.save(EquipmentStatusHistory.builder()
            .equipment(equipment)
            .changedBy(changedBy)
            .previousStatus(previousStatus)
            .newStatus(request.newStatus())
            .reason(request.reason())
            .build());

    return EquipmentResponse.from(equipment);
}

@Transactional(readOnly = true)
public List<EquipmentStatusHistoryResponse> getStatusHistories(Long id) {
    Equipment equipment = getEquipment(id);
    return statusHistoryRepository.findByEquipmentOrderByChangedAtDesc(equipment)
            .stream()
            .map(EquipmentStatusHistoryResponse::from)
            .toList();
}
```

임포트 추가:
```java
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatusHistory;
import java.util.List;
```

- [ ] **Step 5: EquipmentController에 엔드포인트 2개 추가**

```java
// 컨트롤러에 추가
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.util.List;

@PatchMapping("/{id}/status")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public ResponseEntity<EquipmentResponse> changeStatus(
        @PathVariable Long id,
        @Valid @RequestBody EquipmentStatusChangeRequest request,
        @AuthenticationPrincipal Long userId
) {
    return ResponseEntity.ok(equipmentService.changeStatus(id, request, userId));
}

@GetMapping("/{id}/status-histories")
public ResponseEntity<List<EquipmentStatusHistoryResponse>> getStatusHistories(@PathVariable Long id) {
    return ResponseEntity.ok(equipmentService.getStatusHistories(id));
}
```

- [ ] **Step 6: EquipmentControllerTest에 상태변경 테스트 추가**

```java
@Test
@DisplayName("MANAGER가 상태변경 → 이력 자동 기록")
void changeStatus_andVerifyHistory() throws Exception {
    EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
    Equipment eq = equipmentRepository.save(Equipment.builder()
            .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

    var body = Map.of("newStatus", "BROKEN", "reason", "모터 과열 감지");

    mockMvc.perform(patch("/api/equipments/" + eq.getId() + "/status")
                    .header("Authorization", managerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("BROKEN"));

    mockMvc.perform(get("/api/equipments/" + eq.getId() + "/status-histories")
                    .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].newStatus").value("BROKEN"))
            .andExpect(jsonPath("$[0].reason").value("모터 과열 감지"))
            .andExpect(jsonPath("$[0].previousStatus").value("NORMAL"));
}

@Test
@DisplayName("reason 없이 상태변경 → 400")
void changeStatus_noReason_400() throws Exception {
    EquipmentType type = equipmentTypeRepository.save(EquipmentType.builder().name("로봇암").build());
    Equipment eq = equipmentRepository.save(Equipment.builder()
            .equipmentNo("EQ-001").name("로봇팔A").type(type).assignee(worker).build());

    var body = Map.of("newStatus", "BROKEN");

    mockMvc.perform(patch("/api/equipments/" + eq.getId() + "/status")
                    .header("Authorization", managerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
}
```

Run:
```bash
./gradlew test --tests "com.factorycare.backend.domain.equipment.EquipmentControllerTest"
```
Expected: 8 tests PASS

- [ ] **Step 7: 전체 테스트 통과 확인**

```bash
./gradlew test
```
Expected: `BUILD SUCCESSFUL` (모든 기존 + 신규 테스트 PASS)

- [ ] **Step 8: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/equipment/ \
        backend/src/test/java/com/factorycare/backend/domain/equipment/
git commit -m "feat(equipment): 상태변경 API + 이력 자동 기록 구현"
```

---

### Task 6: Frontend 타입 정의 + API 클라이언트

**Files:**
- Create: `frontend/src/types/equipment.ts`
- Create: `frontend/src/api/equipment.ts`

**Interfaces:**
- Consumes: 기존 `frontend/src/api/axiosInstance.ts`
- Produces: `equipmentApi`, `equipmentTypeApi` — Task 7~9에서 사용

- [ ] **Step 1: 타입 정의 생성**

```typescript
// frontend/src/types/equipment.ts
export type EquipmentStatus = 'NORMAL' | 'INSPECTION_NEEDED' | 'BROKEN' | 'REPAIRING' | 'DISCARDED'

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  NORMAL: '정상',
  INSPECTION_NEEDED: '점검필요',
  BROKEN: '고장',
  REPAIRING: '수리중',
  DISCARDED: '폐기',
}

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  NORMAL: 'bg-green-100 text-green-800',
  INSPECTION_NEEDED: 'bg-yellow-100 text-yellow-800',
  BROKEN: 'bg-red-100 text-red-800',
  REPAIRING: 'bg-blue-100 text-blue-800',
  DISCARDED: 'bg-gray-100 text-gray-800',
}

export interface EquipmentType {
  id: number
  name: string
  description: string | null
}

export interface Equipment {
  id: number
  equipmentNo: string
  name: string
  type: EquipmentType | null
  manufacturer: string | null
  modelName: string | null
  installedAt: string | null
  location: string | null
  department: string | null
  assignee: { id: number; name: string; loginId: string } | null
  status: EquipmentStatus
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface EquipmentSearchParams {
  equipmentNo?: string
  name?: string
  typeId?: number
  status?: EquipmentStatus
  location?: string
  assigneeId?: number
  page?: number
  size?: number
  sort?: string
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

export interface EquipmentStatusHistory {
  id: number
  previousStatus: EquipmentStatus
  newStatus: EquipmentStatus
  reason: string
  changedByName: string
  changedAt: string
}

export interface EquipmentCreateRequest {
  equipmentNo: string
  name: string
  typeId?: number
  manufacturer?: string
  modelName?: string
  installedAt?: string
  location?: string
  department?: string
  assigneeId?: number
  description?: string
}

export type EquipmentUpdateRequest = Partial<Omit<EquipmentCreateRequest, 'equipmentNo'>>
```

- [ ] **Step 2: API 클라이언트 생성**

```typescript
// frontend/src/api/equipment.ts
import axiosInstance from './axiosInstance'
import type {
  Equipment,
  EquipmentCreateRequest,
  EquipmentSearchParams,
  EquipmentStatusHistory,
  EquipmentType,
  EquipmentUpdateRequest,
  SpringPage,
  EquipmentStatus,
} from '../types/equipment'

export const equipmentTypeApi = {
  getAll: () =>
    axiosInstance.get<EquipmentType[]>('/equipment-types').then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    axiosInstance.post<EquipmentType>('/equipment-types', data).then((r) => r.data),

  update: (id: number, data: { name?: string; description?: string }) =>
    axiosInstance.patch<EquipmentType>(`/equipment-types/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/equipment-types/${id}`),
}

export const equipmentApi = {
  search: (params: EquipmentSearchParams) =>
    axiosInstance
      .get<SpringPage<Equipment>>('/equipments', { params })
      .then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Equipment>(`/equipments/${id}`).then((r) => r.data),

  create: (data: EquipmentCreateRequest) =>
    axiosInstance.post<Equipment>('/equipments', data).then((r) => r.data),

  update: (id: number, data: EquipmentUpdateRequest) =>
    axiosInstance.patch<Equipment>(`/equipments/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/equipments/${id}`),

  changeStatus: (id: number, data: { newStatus: EquipmentStatus; reason: string }) =>
    axiosInstance.patch<Equipment>(`/equipments/${id}/status`, data).then((r) => r.data),

  getStatusHistories: (id: number) =>
    axiosInstance
      .get<EquipmentStatusHistory[]>(`/equipments/${id}/status-histories`)
      .then((r) => r.data),
}
```

- [ ] **Step 3: 타입 컴파일 확인**

```bash
cd frontend
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/types/equipment.ts frontend/src/api/equipment.ts
git commit -m "feat(frontend): 설비관리 타입 정의 + API 클라이언트 구현"
```

---

### Task 7: Frontend 설비 목록 페이지

**Files:**
- Create: `frontend/src/pages/equipment/EquipmentListPage.tsx`
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Consumes: `equipmentApi.search()`, `equipmentTypeApi.getAll()` (Task 6)
- Produces: `/equipments` 라우트

- [ ] **Step 1: EquipmentListPage 생성**

```tsx
// frontend/src/pages/equipment/EquipmentListPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { equipmentApi, equipmentTypeApi } from '../../api/equipment'
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_COLORS,
  type EquipmentSearchParams,
  type EquipmentStatus,
} from '../../types/equipment'

const STATUS_OPTIONS: EquipmentStatus[] = [
  'NORMAL',
  'INSPECTION_NEEDED',
  'BROKEN',
  'REPAIRING',
  'DISCARDED',
]

export default function EquipmentListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<EquipmentSearchParams>({ page: 0, size: 10 })

  const { data, isLoading } = useQuery({
    queryKey: ['equipments', params],
    queryFn: () => equipmentApi.search(params),
  })

  const { data: types } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: equipmentTypeApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => equipmentApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipments'] }),
  })

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setParams({
      page: 0,
      size: 10,
      equipmentNo: fd.get('equipmentNo') as string || undefined,
      name: fd.get('name') as string || undefined,
      typeId: fd.get('typeId') ? Number(fd.get('typeId')) : undefined,
      status: fd.get('status') as EquipmentStatus || undefined,
      location: fd.get('location') as string || undefined,
    })
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">설비 목록</h1>
        <button
          onClick={() => navigate('/equipments/new')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          설비 등록
        </button>
      </div>

      {/* 검색 필터 */}
      <form onSubmit={handleSearch} className="mb-6 grid grid-cols-3 gap-3 rounded-lg border bg-gray-50 p-4">
        <input name="equipmentNo" placeholder="설비번호" className="rounded border px-3 py-2 text-sm" />
        <input name="name" placeholder="설비명" className="rounded border px-3 py-2 text-sm" />
        <select name="typeId" className="rounded border px-3 py-2 text-sm">
          <option value="">전체 유형</option>
          {types?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select name="status" className="rounded border px-3 py-2 text-sm">
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input name="location" placeholder="위치" className="rounded border px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          검색
        </button>
      </form>

      {/* 목록 테이블 */}
      {isLoading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['설비번호', '설비명', '유형', '위치', '담당자', '상태', '작업'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.content.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{eq.equipmentNo}</td>
                    <td className="px-4 py-3">{eq.name}</td>
                    <td className="px-4 py-3 text-gray-500">{eq.type?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{eq.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{eq.assignee?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[eq.status]}`}>
                        {EQUIPMENT_STATUS_LABELS[eq.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/equipments/${eq.id}`)}
                        className="mr-2 text-blue-600 hover:underline"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => navigate(`/equipments/${eq.id}/edit`)}
                        className="mr-2 text-gray-600 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('비활성화하시겠습니까?')) deleteMutation.mutate(eq.id)
                        }}
                        className="text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              disabled={data?.first}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1}
            </span>
            <button
              disabled={data?.last}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 0) + 1 }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 라우터에 설비 라우트 추가**

```tsx
// frontend/src/router/index.tsx
import { createBrowserRouter } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import EquipmentListPage from '../pages/equipment/EquipmentListPage'
import EquipmentFormPage from '../pages/equipment/EquipmentFormPage'
import EquipmentDetailPage from '../pages/equipment/EquipmentDetailPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/equipments', element: <EquipmentListPage /> },
  { path: '/equipments/new', element: <EquipmentFormPage /> },
  { path: '/equipments/:id', element: <EquipmentDetailPage /> },
  { path: '/equipments/:id/edit', element: <EquipmentFormPage /> },
])

export default router
```

- [ ] **Step 3: 타입 확인**

```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/pages/equipment/EquipmentListPage.tsx \
        frontend/src/router/index.tsx
git commit -m "feat(frontend): 설비 목록 페이지 + 라우팅 구현"
```

---

### Task 8: Frontend 설비 등록/수정 폼

**Files:**
- Create: `frontend/src/pages/equipment/EquipmentFormPage.tsx`

**Interfaces:**
- Consumes: `equipmentApi.create()`, `equipmentApi.update()`, `equipmentApi.getById()`, `equipmentTypeApi.getAll()` (Task 6)
- Produces: `/equipments/new`, `/equipments/:id/edit` 라우트

- [ ] **Step 1: EquipmentFormPage 생성**

```tsx
// frontend/src/pages/equipment/EquipmentFormPage.tsx
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { equipmentApi, equipmentTypeApi } from '../../api/equipment'
import type { EquipmentCreateRequest } from '../../types/equipment'

export default function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EquipmentCreateRequest>()

  const { data: existing } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: types } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: equipmentTypeApi.getAll,
  })

  useEffect(() => {
    if (existing) {
      reset({
        equipmentNo: existing.equipmentNo,
        name: existing.name,
        typeId: existing.type?.id,
        manufacturer: existing.manufacturer ?? '',
        modelName: existing.modelName ?? '',
        installedAt: existing.installedAt ?? '',
        location: existing.location ?? '',
        department: existing.department ?? '',
        assigneeId: existing.assignee?.id,
        description: existing.description ?? '',
      })
    }
  }, [existing, reset])

  const createMutation = useMutation({
    mutationFn: (data: EquipmentCreateRequest) => equipmentApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      navigate(`/equipments/${res.id}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: EquipmentCreateRequest) => equipmentApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      queryClient.invalidateQueries({ queryKey: ['equipment', id] })
      navigate(`/equipments/${id}`)
    },
  })

  const onSubmit = (data: EquipmentCreateRequest) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">
        {isEdit ? '설비 수정' : '설비 등록'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설비번호 *</label>
          <input
            {...register('equipmentNo', { required: '설비번호는 필수입니다.' })}
            disabled={isEdit}
            className="w-full rounded border px-3 py-2 text-sm disabled:bg-gray-100"
          />
          {errors.equipmentNo && <p className="mt-1 text-xs text-red-500">{errors.equipmentNo.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설비명 *</label>
          <input
            {...register('name', { required: '설비명은 필수입니다.' })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설비유형</label>
          <select {...register('typeId', { setValueAs: (v) => v ? Number(v) : undefined })}
            className="w-full rounded border px-3 py-2 text-sm">
            <option value="">선택 안함</option>
            {types?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {[
          { field: 'manufacturer' as const, label: '제조사' },
          { field: 'modelName' as const, label: '모델명' },
          { field: 'location' as const, label: '위치' },
          { field: 'department' as const, label: '관리부서' },
        ].map(({ field, label }) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input {...register(field)} className="w-full rounded border px-3 py-2 text-sm" />
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설치일</label>
          <input type="date" {...register('installedAt')} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">설명</label>
          <textarea {...register('description')} rows={3} className="w-full rounded border px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            취소
          </button>
          <button type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {isEdit ? '수정' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

> `react-hook-form`이 미설치 상태라면 먼저 설치:
> ```bash
> cd frontend && npm install react-hook-form
> ```

- [ ] **Step 2: 타입 확인**

```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/equipment/EquipmentFormPage.tsx
git commit -m "feat(frontend): 설비 등록/수정 폼 구현"
```

---

### Task 9: Frontend 설비 상세 + 상태변경 모달 + 이력

**Files:**
- Create: `frontend/src/components/equipment/StatusChangeModal.tsx`
- Create: `frontend/src/pages/equipment/EquipmentDetailPage.tsx`

**Interfaces:**
- Consumes: `equipmentApi.getById()`, `equipmentApi.changeStatus()`, `equipmentApi.getStatusHistories()` (Task 6)

- [ ] **Step 1: StatusChangeModal 컴포넌트 생성**

```tsx
// frontend/src/components/equipment/StatusChangeModal.tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentApi } from '../../api/equipment'
import { EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from '../../types/equipment'

const STATUS_OPTIONS: EquipmentStatus[] = [
  'NORMAL', 'INSPECTION_NEEDED', 'BROKEN', 'REPAIRING', 'DISCARDED',
]

interface Props {
  equipmentId: number
  currentStatus: EquipmentStatus
  onClose: () => void
}

export default function StatusChangeModal({ equipmentId, currentStatus, onClose }: Props) {
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = useState<EquipmentStatus>(currentStatus)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => equipmentApi.changeStatus(equipmentId, { newStatus, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', String(equipmentId)] })
      queryClient.invalidateQueries({ queryKey: ['equipment-histories', equipmentId] })
      onClose()
    },
  })

  const handleSubmit = () => {
    if (!reason.trim()) { setError('변경 사유를 입력해주세요.'); return }
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">상태 변경</h2>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">변경할 상태</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as EquipmentStatus)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">변경 사유 *</label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError('') }}
            rows={3}
            placeholder="상태 변경 사유를 입력하세요."
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? '처리 중...' : '변경'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: EquipmentDetailPage 생성**

```tsx
// frontend/src/pages/equipment/EquipmentDetailPage.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentApi } from '../../api/equipment'
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLORS } from '../../types/equipment'
import StatusChangeModal from '../../components/equipment/StatusChangeModal'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.getById(Number(id)),
    enabled: Boolean(id),
  })

  const { data: histories } = useQuery({
    queryKey: ['equipment-histories', Number(id)],
    queryFn: () => equipmentApi.getStatusHistories(Number(id)),
    enabled: Boolean(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => equipmentApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      navigate('/equipments')
    },
  })

  if (isLoading) return <p className="p-6 text-center text-gray-500">로딩 중...</p>
  if (!equipment) return <p className="p-6 text-center text-red-500">설비를 찾을 수 없습니다.</p>

  const fields = [
    { label: '설비번호', value: equipment.equipmentNo },
    { label: '설비유형', value: equipment.type?.name ?? '—' },
    { label: '제조사', value: equipment.manufacturer ?? '—' },
    { label: '모델명', value: equipment.modelName ?? '—' },
    { label: '설치일', value: equipment.installedAt ?? '—' },
    { label: '위치', value: equipment.location ?? '—' },
    { label: '관리부서', value: equipment.department ?? '—' },
    { label: '담당자', value: equipment.assignee?.name ?? '—' },
  ]

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{equipment.name}</h1>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[equipment.status]}`}>
            {EQUIPMENT_STATUS_LABELS[equipment.status]}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)}
            className="rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50">
            상태변경
          </button>
          <button onClick={() => navigate(`/equipments/${id}/edit`)}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            수정
          </button>
          <button
            onClick={() => { if (confirm('비활성화하시겠습니까?')) deleteMutation.mutate() }}
            className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">
            삭제
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-700">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-500">{label}</dt>
              <dd className="mt-0.5 text-sm text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>
        {equipment.description && (
          <div className="mt-3">
            <dt className="text-xs font-medium text-gray-500">설명</dt>
            <dd className="mt-0.5 text-sm text-gray-800">{equipment.description}</dd>
          </div>
        )}
      </div>

      {/* 상태변경 이력 */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-700">상태변경 이력</h2>
        {histories && histories.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {histories.map((h) => (
              <li key={h.id} className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[h.previousStatus]}`}>
                    {EQUIPMENT_STATUS_LABELS[h.previousStatus]}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[h.newStatus]}`}>
                    {EQUIPMENT_STATUS_LABELS[h.newStatus]}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{new Date(h.changedAt).toLocaleString('ko-KR')}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{h.reason}</p>
                <p className="text-xs text-gray-400">변경자: {h.changedByName}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">변경 이력이 없습니다.</p>
        )}
      </div>

      {showModal && (
        <StatusChangeModal
          equipmentId={equipment.id}
          currentStatus={equipment.status}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 타입 확인**

```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 최종 전체 테스트**

```bash
cd ../backend
./gradlew test
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/ frontend/src/pages/equipment/EquipmentDetailPage.tsx
git commit -m "feat(frontend): 설비 상세 페이지 + 상태변경 모달 + 이력 조회 구현"
```

---

## Self-Review

**스펙 커버리지 체크:**
- ✅ EquipmentType CRUD (Task 2)
- ✅ Equipment CRUD + Soft delete (Task 3, 4)
- ✅ QueryDSL 동적 검색 + 페이징 (Task 3, 4)
- ✅ 상태변경 + 이력 기록 (Task 5)
- ✅ 역할별 권한 제어 (Tasks 2, 4, 5 — `@PreAuthorize`)
- ✅ Frontend 4개 라우트 (Tasks 7, 8, 9)
- ✅ 삭제 정책: Equipment soft delete, EquipmentType 사용 중 삭제 불가 (Task 2 service)

**타입 일관성:**
- `EquipmentService.getEquipmentType()` — Task 2에서 `public` 메서드로 정의, Task 4에서 호출
- `EquipmentService.getEquipment()` — Task 4에서 package-private, Task 5에서 동일 패키지 내 접근
- `EquipmentStatusHistoryResponse.from()` — Task 5에서 정의, 컨트롤러에서 사용
- `equipmentApi`, `equipmentTypeApi` — Task 6에서 정의, Tasks 7~9에서 사용

**플레이스홀더 없음 확인:** 모든 코드 블록 완성, TBD 없음.
