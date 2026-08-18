# 장애관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WBS 6.0~6.3 — 장애 CRUD + 상태머신 + 점검결과 자동연동 백엔드 API + 프론트엔드 4페이지 구현

**Architecture:** Equipment/Inspection 도메인 패턴 동일 — Entity→Service→Controller, QueryDSL for 검색, 상태전이 규칙을 Entity 내부에 캡슐화. 브랜치: `feat/fault` (백엔드), `feat/fault-frontend` (프론트엔드).

**Tech Stack:** Spring Boot 4.1, Spring Security+JWT, QueryDSL, React+TypeScript+Vite, TanStack Query v5, Tailwind CSS

## Global Constraints

- 패키지 루트: `com.factorycare.backend`
- 테스트: `@ActiveProfiles("test")`, H2 in-memory, `tools.jackson.databind.ObjectMapper`, `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`
- Entity: `@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)` + `@Builder` 생성자
- DTO: Java record + `static from(Entity)` 팩토리
- Controller: 생성자 주입, `@PreAuthorize` 역할 제어
- Frontend API: `axiosInstance` 사용, baseURL `/api` (기존 패턴)
- `GlobalExceptionHandler`: `IllegalStateException` → **409 CONFLICT**, `IllegalArgumentException` → 400
- `SpringPage<T>` 타입: `frontend/src/types/equipment.ts`에 이미 정의됨 — 재정의 금지, import해서 사용

---

### Task 1: 브랜치 생성 + Fault 엔티티 + QueryDSL 리포지토리

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/entity/FaultSeverity.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/entity/FaultStatus.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/entity/Fault.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/entity/FaultStatusHistory.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/repository/FaultRepository.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/repository/FaultRepositoryCustom.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/repository/FaultRepositoryImpl.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/dto/FaultSearchCondition.java`

**Interfaces:**
- Produces: `Fault` (id, equipment, title, description, severity, status, reportedBy, assignedTo, inspectionResult nullable, statusHistories, resolvedAt, createdAt), `FaultStatusHistory` (id, fault, changedBy, fromStatus, toStatus, reason, changedAt)

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feat/fault
```

- [ ] **Step 2: Enum 작성**

`FaultSeverity.java`:
```java
package com.factorycare.backend.domain.fault.entity;
public enum FaultSeverity { LOW, MEDIUM, HIGH, CRITICAL }
```

`FaultStatus.java`:
```java
package com.factorycare.backend.domain.fault.entity;
public enum FaultStatus { REPORTED, CONFIRMED, IN_PROGRESS, RESOLVED, CLOSED }
```

- [ ] **Step 3: Fault 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/fault/entity/Fault.java`:
```java
package com.factorycare.backend.domain.fault.entity;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "faults")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Fault {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultStatus status = FaultStatus.REPORTED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_id", nullable = false)
    private User reportedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_result_id")
    private InspectionResult inspectionResult;

    @OneToMany(mappedBy = "fault", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("changedAt ASC")
    private List<FaultStatusHistory> statusHistories = new ArrayList<>();

    private LocalDateTime resolvedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Fault(Equipment equipment, String title, String description,
                 FaultSeverity severity, User reportedBy, InspectionResult inspectionResult) {
        this.equipment = equipment;
        this.title = title;
        this.description = description;
        this.severity = severity != null ? severity : FaultSeverity.MEDIUM;
        this.reportedBy = reportedBy;
        this.inspectionResult = inspectionResult;
    }

    public void update(String title, String description, FaultSeverity severity) {
        if (title != null) this.title = title;
        if (description != null) this.description = description;
        if (severity != null) this.severity = severity;
    }

    public void changeStatus(FaultStatus newStatus) {
        validateTransition(this.status, newStatus);
        if (newStatus == FaultStatus.RESOLVED) {
            this.resolvedAt = LocalDateTime.now();
        }
        this.status = newStatus;
    }

    public void assignTo(User user) {
        this.assignedTo = user;
    }

    private void validateTransition(FaultStatus from, FaultStatus to) {
        boolean valid = switch (from) {
            case REPORTED -> to == FaultStatus.CONFIRMED;
            case CONFIRMED -> to == FaultStatus.IN_PROGRESS;
            case IN_PROGRESS -> to == FaultStatus.RESOLVED;
            case RESOLVED -> to == FaultStatus.CLOSED || to == FaultStatus.IN_PROGRESS;
            case CLOSED -> false;
        };
        if (!valid) throw new IllegalStateException(from + " → " + to + " 상태 전이 불가");
    }
}
```

- [ ] **Step 4: FaultStatusHistory 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/fault/entity/FaultStatusHistory.java`:
```java
package com.factorycare.backend.domain.fault.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fault_status_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FaultStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fault_id", nullable = false)
    private Fault fault;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_id", nullable = false)
    private User changedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FaultStatus toStatus;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    @Builder
    public FaultStatusHistory(Fault fault, User changedBy, FaultStatus fromStatus,
                               FaultStatus toStatus, String reason) {
        this.fault = fault;
        this.changedBy = changedBy;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.reason = reason;
    }
}
```

- [ ] **Step 5: QueryDSL 리포지토리 작성**

`FaultSearchCondition.java`:
```java
package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import java.time.LocalDate;

public record FaultSearchCondition(
    Long equipmentId,
    FaultStatus status,
    FaultSeverity severity,
    Long assigneeId,
    LocalDate from,
    LocalDate to
) {}
```

`FaultRepositoryCustom.java`:
```java
package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.dto.FaultSearchCondition;
import com.factorycare.backend.domain.fault.entity.Fault;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FaultRepositoryCustom {
    Page<Fault> search(FaultSearchCondition cond, Pageable pageable);
}
```

`FaultRepositoryImpl.java`:
```java
package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.dto.FaultSearchCondition;
import com.factorycare.backend.domain.fault.entity.*;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public class FaultRepositoryImpl implements FaultRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public FaultRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<Fault> search(FaultSearchCondition cond, Pageable pageable) {
        QFault qf = QFault.fault;

        List<Fault> content = queryFactory
            .selectFrom(qf)
            .where(
                equipmentEq(qf, cond.equipmentId()),
                statusEq(qf, cond.status()),
                severityEq(qf, cond.severity()),
                assigneeEq(qf, cond.assigneeId()),
                dateFrom(qf, cond.from()),
                dateTo(qf, cond.to())
            )
            .orderBy(qf.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory
            .select(qf.count()).from(qf)
            .where(
                equipmentEq(qf, cond.equipmentId()),
                statusEq(qf, cond.status()),
                severityEq(qf, cond.severity()),
                assigneeEq(qf, cond.assigneeId()),
                dateFrom(qf, cond.from()),
                dateTo(qf, cond.to())
            ).fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentEq(QFault qf, Long id) {
        return id != null ? qf.equipment.id.eq(id) : null;
    }
    private BooleanExpression statusEq(QFault qf, FaultStatus s) {
        return s != null ? qf.status.eq(s) : null;
    }
    private BooleanExpression severityEq(QFault qf, FaultSeverity s) {
        return s != null ? qf.severity.eq(s) : null;
    }
    private BooleanExpression assigneeEq(QFault qf, Long id) {
        return id != null ? qf.assignedTo.id.eq(id) : null;
    }
    private BooleanExpression dateFrom(QFault qf, LocalDate from) {
        return from != null ? qf.createdAt.goe(from.atStartOfDay()) : null;
    }
    private BooleanExpression dateTo(QFault qf, LocalDate to) {
        return to != null ? qf.createdAt.loe(to.plusDays(1).atStartOfDay()) : null;
    }
}
```

`FaultRepository.java`:
```java
package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.entity.Fault;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaultRepository extends JpaRepository<Fault, Long>, FaultRepositoryCustom {}
```

- [ ] **Step 6: 컴파일 + Q클래스 생성**

```bash
cd backend && ./gradlew compileJava
```
Expected: BUILD SUCCESSFUL (QFault, QFaultStatusHistory 자동 생성됨)

- [ ] **Step 7: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/fault/
git commit -m "feat(fault): Fault 엔티티 + QueryDSL 리포지토리"
```

---

### Task 2: Fault DTO + Service + Controller + 통합 테스트

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/dto/FaultResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/dto/FaultStatusHistoryResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/dto/FaultCreateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/dto/FaultUpdateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/dto/FaultStatusChangeRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/dto/FaultAssignRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/service/FaultService.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/fault/controller/FaultController.java`
- Create: `backend/src/test/java/com/factorycare/backend/domain/fault/FaultControllerTest.java`

**Interfaces:**
- Consumes: `FaultRepository`, `EquipmentRepository.findByIdAndActiveTrue(Long)`, `UserRepository.findById(Long)`
- Produces: REST API `GET|POST /api/faults`, `GET|PATCH|DELETE /api/faults/{id}`, `PATCH /api/faults/{id}/status`, `PATCH /api/faults/{id}/assign`
- Also produces: `FaultService.createFromInspectionResult(InspectionResult, User)` — Task 3에서 사용

- [ ] **Step 1: 실패 테스트 작성**

`backend/src/test/java/com/factorycare/backend/domain/fault/FaultControllerTest.java`:
```java
package com.factorycare.backend.domain.fault;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.entity.*;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
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
class FaultControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;
    User worker;
    Equipment equipment;

    @BeforeEach
    void setUp() {
        faultRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
            .loginId("admin01").password(passwordEncoder.encode("pw"))
            .name("관리자").role(UserRole.ADMIN).build());
        User manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        equipment = equipmentRepository.save(
            Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());
    }

    @Test
    @DisplayName("WORKER가 장애 등록 → 201")
    void create_asWorker() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "title", "모터 과열",
            "severity", "HIGH"
        );
        mockMvc.perform(post("/api/faults")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("REPORTED"))
            .andExpect(jsonPath("$.equipmentName").value("컨베이어"))
            .andExpect(jsonPath("$.severity").value("HIGH"))
            .andExpect(jsonPath("$.reportedByName").value("작업자"));
    }

    @Test
    @DisplayName("장애 목록 페이징 조회")
    void search() throws Exception {
        faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.HIGH).reportedBy(worker).build());

        mockMvc.perform(get("/api/faults")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    @DisplayName("MANAGER가 상태를 CONFIRMED로 변경 + 이력 1건")
    void changeStatus_toConfirmed() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.MEDIUM).reportedBy(worker).build());

        var body = Map.of("status", "CONFIRMED", "reason", "현장 확인 완료");
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/status")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.statusHistories.length()").value(1))
            .andExpect(jsonPath("$.statusHistories[0].reason").value("현장 확인 완료"));
    }

    @Test
    @DisplayName("WORKER가 상태변경 시도 → 403")
    void changeStatus_asWorker_403() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.LOW).reportedBy(worker).build());

        var body = Map.of("status", "CONFIRMED", "reason", "테스트");
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/status")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("잘못된 상태 전이 → 409")
    void changeStatus_invalidTransition_409() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.LOW).reportedBy(worker).build());

        var body = Map.of("status", "CLOSED", "reason", "바로 닫기");
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/status")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("MANAGER가 담당자 배정")
    void assign() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("장애1")
            .severity(FaultSeverity.MEDIUM).reportedBy(worker).build());

        var body = Map.of("assigneeId", worker.getId());
        mockMvc.perform(patch("/api/faults/" + fault.getId() + "/assign")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assignedToName").value("작업자"));
    }

    @Test
    @DisplayName("ADMIN이 장애 삭제 → 204")
    void delete_asAdmin() throws Exception {
        Fault fault = faultRepository.save(Fault.builder()
            .equipment(equipment).title("삭제대상")
            .severity(FaultSeverity.LOW).reportedBy(worker).build());

        mockMvc.perform(delete("/api/faults/" + fault.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd backend && ./gradlew test --tests "*.FaultControllerTest" 2>&1 | tail -10
```
Expected: FAILED (컨트롤러/서비스 없음)

- [ ] **Step 3: DTO 작성**

`FaultStatusHistoryResponse.java`:
```java
package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.entity.FaultStatusHistory;
import java.time.LocalDateTime;

public record FaultStatusHistoryResponse(
    Long id,
    FaultStatus fromStatus,
    FaultStatus toStatus,
    String changedByName,
    String reason,
    LocalDateTime changedAt
) {
    public static FaultStatusHistoryResponse from(FaultStatusHistory h) {
        return new FaultStatusHistoryResponse(
            h.getId(), h.getFromStatus(), h.getToStatus(),
            h.getChangedBy().getName(), h.getReason(), h.getChangedAt()
        );
    }
}
```

`FaultResponse.java`:
```java
package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import java.time.LocalDateTime;
import java.util.List;

public record FaultResponse(
    Long id,
    Long equipmentId, String equipmentName,
    String title, String description,
    FaultSeverity severity,
    FaultStatus status,
    Long reportedById, String reportedByName,
    Long assignedToId, String assignedToName,
    Long inspectionResultId,
    LocalDateTime resolvedAt,
    List<FaultStatusHistoryResponse> statusHistories,
    LocalDateTime createdAt
) {
    public static FaultResponse from(Fault f) {
        return new FaultResponse(
            f.getId(),
            f.getEquipment().getId(), f.getEquipment().getName(),
            f.getTitle(), f.getDescription(),
            f.getSeverity(), f.getStatus(),
            f.getReportedBy().getId(), f.getReportedBy().getName(),
            f.getAssignedTo() != null ? f.getAssignedTo().getId() : null,
            f.getAssignedTo() != null ? f.getAssignedTo().getName() : null,
            f.getInspectionResult() != null ? f.getInspectionResult().getId() : null,
            f.getResolvedAt(),
            f.getStatusHistories().stream().map(FaultStatusHistoryResponse::from).toList(),
            f.getCreatedAt()
        );
    }
}
```

`FaultCreateRequest.java`:
```java
package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FaultCreateRequest(
    @NotNull Long equipmentId,
    @NotBlank String title,
    String description,
    FaultSeverity severity
) {}
```

`FaultUpdateRequest.java`:
```java
package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultSeverity;

public record FaultUpdateRequest(String title, String description, FaultSeverity severity) {}
```

`FaultStatusChangeRequest.java`:
```java
package com.factorycare.backend.domain.fault.dto;

import com.factorycare.backend.domain.fault.entity.FaultStatus;
import jakarta.validation.constraints.NotNull;

public record FaultStatusChangeRequest(@NotNull FaultStatus status, String reason) {}
```

`FaultAssignRequest.java`:
```java
package com.factorycare.backend.domain.fault.dto;

import jakarta.validation.constraints.NotNull;

public record FaultAssignRequest(@NotNull Long assigneeId) {}
```

- [ ] **Step 4: FaultService 작성**

`backend/src/main/java/com/factorycare/backend/domain/fault/service/FaultService.java`:
```java
package com.factorycare.backend.domain.fault.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.dto.*;
import com.factorycare.backend.domain.fault.entity.*;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FaultService {

    private final FaultRepository faultRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;

    public FaultService(FaultRepository faultRepository,
                        EquipmentRepository equipmentRepository,
                        UserRepository userRepository) {
        this.faultRepository = faultRepository;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<FaultResponse> search(FaultSearchCondition cond, Pageable pageable) {
        return faultRepository.search(cond, pageable).map(FaultResponse::from);
    }

    @Transactional(readOnly = true)
    public FaultResponse findById(Long id) {
        return FaultResponse.from(getFault(id));
    }

    @Transactional
    public FaultResponse create(FaultCreateRequest req, Long reporterId) {
        Equipment equipment = equipmentRepository.findByIdAndActiveTrue(req.equipmentId())
            .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다."));
        User reporter = getUser(reporterId);

        Fault fault = Fault.builder()
            .equipment(equipment).title(req.title())
            .description(req.description()).severity(req.severity())
            .reportedBy(reporter).build();

        return FaultResponse.from(faultRepository.save(fault));
    }

    @Transactional
    public FaultResponse createFromInspectionResult(InspectionResult result, User reporter) {
        Equipment equipment = result.getInspection().getSchedule().getEquipment();
        Fault fault = Fault.builder()
            .equipment(equipment)
            .title("[점검이상] " + result.getItemName())
            .description(result.getNote())
            .severity(FaultSeverity.MEDIUM)
            .reportedBy(reporter)
            .inspectionResult(result)
            .build();
        return FaultResponse.from(faultRepository.save(fault));
    }

    @Transactional
    public FaultResponse update(Long id, FaultUpdateRequest req) {
        Fault fault = getFault(id);
        fault.update(req.title(), req.description(), req.severity());
        return FaultResponse.from(fault);
    }

    @Transactional
    public FaultResponse changeStatus(Long id, FaultStatusChangeRequest req, Long userId) {
        Fault fault = getFault(id);
        FaultStatus oldStatus = fault.getStatus();
        fault.changeStatus(req.status());

        FaultStatusHistory history = FaultStatusHistory.builder()
            .fault(fault).changedBy(getUser(userId))
            .fromStatus(oldStatus).toStatus(req.status()).reason(req.reason())
            .build();
        fault.getStatusHistories().add(history);

        return FaultResponse.from(fault);
    }

    @Transactional
    public FaultResponse assign(Long id, FaultAssignRequest req) {
        Fault fault = getFault(id);
        fault.assignTo(getUser(req.assigneeId()));
        return FaultResponse.from(fault);
    }

    @Transactional
    public void delete(Long id) {
        faultRepository.delete(getFault(id));
    }

    Fault getFault(Long id) {
        return faultRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("장애를 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
```

- [ ] **Step 5: FaultController 작성**

`backend/src/main/java/com/factorycare/backend/domain/fault/controller/FaultController.java`:
```java
package com.factorycare.backend.domain.fault.controller;

import com.factorycare.backend.domain.fault.dto.*;
import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.service.FaultService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/faults")
public class FaultController {

    private final FaultService service;

    public FaultController(FaultService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<FaultResponse>> search(
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) FaultStatus status,
            @RequestParam(required = false) FaultSeverity severity,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(service.search(
            new FaultSearchCondition(equipmentId, status, severity, assigneeId, from, to), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FaultResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<FaultResponse> create(
            @Valid @RequestBody FaultCreateRequest req,
            @AuthenticationPrincipal Long userId) {
        FaultResponse res = service.create(req, userId);
        return ResponseEntity.created(URI.create("/api/faults/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<FaultResponse> update(
            @PathVariable Long id,
            @RequestBody FaultUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<FaultResponse> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody FaultStatusChangeRequest req,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(service.changeStatus(id, req, userId));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<FaultResponse> assign(
            @PathVariable Long id,
            @Valid @RequestBody FaultAssignRequest req) {
        return ResponseEntity.ok(service.assign(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

```bash
cd backend && ./gradlew test --tests "*.FaultControllerTest"
```
Expected: BUILD SUCCESSFUL, 6 tests passed

- [ ] **Step 7: 커밋**

```bash
git add backend/src/
git commit -m "feat(fault): 장애 CRUD + 상태전이 API"
```

---

### Task 3: 점검결과 연동 — InspectionService.complete() 수정

**Files:**
- Modify: `backend/src/main/java/com/factorycare/backend/domain/inspection/service/InspectionService.java`
- Create: `backend/src/test/java/com/factorycare/backend/domain/fault/FaultAutoCreateTest.java`

**Interfaces:**
- Consumes: `FaultService.createFromInspectionResult(InspectionResult, User)` (Task 2)
- Produces: 점검 완료 시 FAIL 항목당 Fault 1건 자동 생성

- [ ] **Step 1: 실패 테스트 작성**

`backend/src/test/java/com/factorycare/backend/domain/fault/FaultAutoCreateTest.java`:
```java
package com.factorycare.backend.domain.fault;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FaultAutoCreateTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired InspectionChecklistRepository checklistRepository;
    @Autowired InspectionChecklistItemRepository checklistItemRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionResultRepository resultRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String workerToken;
    User worker;
    InspectionChecklistItem item1, item2;
    Inspection inspection;

    @BeforeEach
    void setUp() {
        faultRepository.deleteAll();
        resultRepository.deleteAll();
        inspectionRepository.deleteAll();
        scheduleRepository.deleteAll();
        checklistRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        Equipment eq = equipmentRepository.save(
            Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());

        InspectionChecklist checklist = checklistRepository.save(
            InspectionChecklist.builder().name("일일점검").build());

        item1 = checklistItemRepository.save(InspectionChecklistItem.builder()
            .checklist(checklist).itemName("모터 온도").itemOrder(1).build());
        item2 = checklistItemRepository.save(InspectionChecklistItem.builder()
            .checklist(checklist).itemName("오일 누유").itemOrder(2).build());

        InspectionSchedule schedule = scheduleRepository.save(
            InspectionSchedule.builder().equipment(eq).checklist(checklist)
                .assignee(worker).scheduledDate(LocalDate.now())
                .inspectionType(InspectionScheduleType.DAILY).build());
        schedule.startInspection();
        scheduleRepository.save(schedule);

        inspection = inspectionRepository.save(
            Inspection.builder().schedule(schedule).inspector(worker).build());
    }

    @Test
    @DisplayName("FAIL 항목 포함 완료 → Fault 자동 생성")
    void complete_withFail_createsFault() throws Exception {
        var body = Map.of("results", List.of(
            Map.of("checklistItemId", item1.getId(), "result", "PASS"),
            Map.of("checklistItemId", item2.getId(), "result", "FAIL", "note", "오일 누유 발견")
        ));
        mockMvc.perform(post("/api/inspections/" + inspection.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk());

        List<?> faults = faultRepository.findAll();
        assertThat(faults).hasSize(1);
    }

    @Test
    @DisplayName("PASS만 완료 → Fault 미생성")
    void complete_allPass_noFault() throws Exception {
        var body = Map.of("results", List.of(
            Map.of("checklistItemId", item1.getId(), "result", "PASS"),
            Map.of("checklistItemId", item2.getId(), "result", "PASS")
        ));
        mockMvc.perform(post("/api/inspections/" + inspection.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk());

        assertThat(faultRepository.findAll()).isEmpty();
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd backend && ./gradlew test --tests "*.FaultAutoCreateTest" 2>&1 | tail -10
```
Expected: FAILED (Fault 미생성)

- [ ] **Step 3: InspectionService.complete() 수정**

`backend/src/main/java/com/factorycare/backend/domain/inspection/service/InspectionService.java` — `FaultService` 주입 및 FAIL 자동 생성 로직 추가:

```java
package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.fault.service.FaultService;
import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InspectionService {

    private final InspectionRepository inspectionRepository;
    private final InspectionResultRepository resultRepository;
    private final InspectionChecklistItemRepository checklistItemRepository;
    private final InspectionScheduleRepository scheduleRepository;
    private final FaultService faultService;

    public InspectionService(InspectionRepository inspectionRepository,
                             InspectionResultRepository resultRepository,
                             InspectionChecklistItemRepository checklistItemRepository,
                             InspectionScheduleRepository scheduleRepository,
                             FaultService faultService) {
        this.inspectionRepository = inspectionRepository;
        this.resultRepository = resultRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.scheduleRepository = scheduleRepository;
        this.faultService = faultService;
    }

    @Transactional(readOnly = true)
    public List<InspectionResponse> findAll() {
        return inspectionRepository.findAll().stream()
            .map(InspectionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public InspectionResponse findById(Long id) {
        Inspection inspection = getInspection(id);
        List<InspectionResultResponse> results = resultRepository
            .findByInspectionIdOrderByChecklistItemItemOrderAsc(id)
            .stream().map(InspectionResultResponse::from).toList();
        return InspectionResponse.from(inspection, results);
    }

    @Transactional
    public InspectionResponse complete(Long id, InspectionCompleteRequest req) {
        Inspection inspection = getInspection(id);
        if (inspection.getStatus() == InspectionStatus.COMPLETED) {
            throw new IllegalStateException("이미 완료된 점검입니다.");
        }

        List<InspectionResult> results = req.results().stream().map(r -> {
            InspectionChecklistItem item = checklistItemRepository.findById(r.checklistItemId())
                .orElseThrow(() -> new IllegalArgumentException("점검 항목을 찾을 수 없습니다. id=" + r.checklistItemId()));
            return InspectionResult.builder()
                .inspection(inspection).checklistItem(item)
                .itemName(item.getItemName()).result(r.result()).note(r.note())
                .build();
        }).toList();

        resultRepository.saveAll(results);

        boolean hasAbnormality = results.stream()
            .anyMatch(r -> r.getResult() == InspectionResultValue.FAIL);
        inspection.complete(hasAbnormality);

        if (hasAbnormality) {
            results.stream()
                .filter(r -> r.getResult() == InspectionResultValue.FAIL)
                .forEach(r -> faultService.createFromInspectionResult(r, inspection.getInspector()));
        }

        inspection.getSchedule().complete();
        scheduleRepository.save(inspection.getSchedule());

        List<InspectionResultResponse> resultResponses = results.stream()
            .map(InspectionResultResponse::from).toList();
        return InspectionResponse.from(inspection, resultResponses);
    }

    private Inspection getInspection(Long id) {
        return inspectionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("점검을 찾을 수 없습니다. id=" + id));
    }
}
```

- [ ] **Step 4: 전체 테스트 실행 → 통과 확인**

```bash
cd backend && ./gradlew test --tests "*.FaultAutoCreateTest" --tests "*.FaultControllerTest" --tests "*.InspectionControllerTest"
```
Expected: BUILD SUCCESSFUL, 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add backend/src/
git commit -m "feat(fault): 점검 FAIL 항목 → Fault 자동 생성 연동"
```

---

### Task 4: Frontend 타입 + API 클라이언트

**Files:**
- Create: `frontend/src/types/fault.ts`
- Create: `frontend/src/api/fault.ts`

**Interfaces:**
- Consumes: `SpringPage<T>` from `../types/equipment` (재사용, 재정의 금지)
- Produces: `faultApi` (search, getById, create, update, changeStatus, assign, delete)

- [ ] **Step 1: 타입 정의 작성**

`frontend/src/types/fault.ts`:
```typescript
import type { SpringPage } from './equipment'

export type { SpringPage }

export type FaultSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type FaultStatus = 'REPORTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export const FAULT_SEVERITY_LABELS: Record<FaultSeverity, string> = {
  LOW: '낮음',
  MEDIUM: '중간',
  HIGH: '높음',
  CRITICAL: '심각',
}

export const FAULT_SEVERITY_COLORS: Record<FaultSeverity, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  REPORTED: '접수',
  CONFIRMED: '확인',
  IN_PROGRESS: '작업중',
  RESOLVED: '해결',
  CLOSED: '완료',
}

export const FAULT_STATUS_COLORS: Record<FaultStatus, string> = {
  REPORTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
}

export const NEXT_STATUS_MAP: Partial<Record<FaultStatus, FaultStatus[]>> = {
  REPORTED: ['CONFIRMED'],
  CONFIRMED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
}

export interface FaultStatusHistory {
  id: number
  fromStatus: FaultStatus
  toStatus: FaultStatus
  changedByName: string
  reason: string | null
  changedAt: string
}

export interface Fault {
  id: number
  equipmentId: number
  equipmentName: string
  title: string
  description: string | null
  severity: FaultSeverity
  status: FaultStatus
  reportedById: number
  reportedByName: string
  assignedToId: number | null
  assignedToName: string | null
  inspectionResultId: number | null
  resolvedAt: string | null
  statusHistories: FaultStatusHistory[]
  createdAt: string
}

export interface FaultCreateRequest {
  equipmentId: number
  title: string
  description?: string
  severity?: FaultSeverity
}

export interface FaultUpdateRequest {
  title?: string
  description?: string
  severity?: FaultSeverity
}

export interface FaultStatusChangeRequest {
  status: FaultStatus
  reason?: string
}

export interface FaultAssignRequest {
  assigneeId: number
}

export interface FaultSearchParams {
  equipmentId?: number
  status?: FaultStatus
  severity?: FaultSeverity
  assigneeId?: number
  from?: string
  to?: string
  page?: number
  size?: number
}
```

- [ ] **Step 2: API 클라이언트 작성**

`frontend/src/api/fault.ts`:
```typescript
import axiosInstance from './axiosInstance'
import type {
  Fault,
  FaultCreateRequest,
  FaultUpdateRequest,
  FaultStatusChangeRequest,
  FaultAssignRequest,
  FaultSearchParams,
  SpringPage,
} from '../types/fault'

export const faultApi = {
  search: (params?: FaultSearchParams) =>
    axiosInstance.get<SpringPage<Fault>>('/faults', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Fault>(`/faults/${id}`).then((r) => r.data),

  create: (data: FaultCreateRequest) =>
    axiosInstance.post<Fault>('/faults', data).then((r) => r.data),

  update: (id: number, data: FaultUpdateRequest) =>
    axiosInstance.patch<Fault>(`/faults/${id}`, data).then((r) => r.data),

  changeStatus: (id: number, data: FaultStatusChangeRequest) =>
    axiosInstance.patch<Fault>(`/faults/${id}/status`, data).then((r) => r.data),

  assign: (id: number, data: FaultAssignRequest) =>
    axiosInstance.patch<Fault>(`/faults/${id}/assign`, data).then((r) => r.data),

  delete: (id: number) =>
    axiosInstance.delete(`/faults/${id}`),
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/types/fault.ts frontend/src/api/fault.ts
git commit -m "feat(fault): 프론트엔드 타입 + API 클라이언트"
```

---

### Task 5: FaultListPage + FaultCreatePage

**Files:**
- Create: `frontend/src/pages/fault/FaultListPage.tsx`
- Create: `frontend/src/pages/fault/FaultCreatePage.tsx`

**Interfaces:**
- Consumes: `faultApi.search`, `faultApi.create`, `equipmentApi.search` (드롭다운용)
- Produces: `/faults` 목록 페이지, `/faults/new` 등록 페이지

- [ ] **Step 1: FaultListPage 작성**

`frontend/src/pages/fault/FaultListPage.tsx`:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { faultApi } from '../../api/fault'
import {
  FAULT_SEVERITY_LABELS,
  FAULT_SEVERITY_COLORS,
  FAULT_STATUS_LABELS,
  FAULT_STATUS_COLORS,
  type FaultSeverity,
  type FaultStatus,
} from '../../types/fault'

export default function FaultListPage() {
  const [status, setStatus] = useState<FaultStatus | ''>('')
  const [severity, setSeverity] = useState<FaultSeverity | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['faults', { status, severity, page }],
    queryFn: () =>
      faultApi.search({
        status: status || undefined,
        severity: severity || undefined,
        page,
      }),
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">장애 관리</h1>
        <Link
          to="/faults/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          장애 등록
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FaultStatus | '')
            setPage(0)
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 상태</option>
          {(Object.keys(FAULT_STATUS_LABELS) as FaultStatus[]).map((s) => (
            <option key={s} value={s}>
              {FAULT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value as FaultSeverity | '')
            setPage(0)
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 긴급도</option>
          {(Object.keys(FAULT_SEVERITY_LABELS) as FaultSeverity[]).map((s) => (
            <option key={s} value={s}>
              {FAULT_SEVERITY_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-200 p-3 text-left">제목</th>
                <th className="border border-gray-200 p-3 text-left">설비</th>
                <th className="border border-gray-200 p-3 text-left">긴급도</th>
                <th className="border border-gray-200 p-3 text-left">상태</th>
                <th className="border border-gray-200 p-3 text-left">등록자</th>
                <th className="border border-gray-200 p-3 text-left">등록일</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((fault) => (
                <tr key={fault.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-3">
                    <Link
                      to={`/faults/${fault.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {fault.title}
                    </Link>
                  </td>
                  <td className="border border-gray-200 p-3">{fault.equipmentName}</td>
                  <td className="border border-gray-200 p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${FAULT_SEVERITY_COLORS[fault.severity]}`}
                    >
                      {FAULT_SEVERITY_LABELS[fault.severity]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${FAULT_STATUS_COLORS[fault.status]}`}
                    >
                      {FAULT_STATUS_LABELS[fault.status]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">{fault.reportedByName}</td>
                  <td className="border border-gray-200 p-3">
                    {new Date(fault.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
              {!data?.content.length && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    등록된 장애가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-3 py-1">
                {page + 1} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages - 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: FaultCreatePage 작성**

`frontend/src/pages/fault/FaultCreatePage.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import { equipmentApi } from '../../api/equipment'
import { FAULT_SEVERITY_LABELS, type FaultSeverity } from '../../types/fault'

export default function FaultCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    equipmentId: '',
    title: '',
    description: '',
    severity: 'MEDIUM' as FaultSeverity,
  })
  const [error, setError] = useState<string | null>(null)

  const { data: equipmentPage } = useQuery({
    queryKey: ['equipments', 'all'],
    queryFn: () => equipmentApi.search({ size: 100 }),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      faultApi.create({
        equipmentId: Number(form.equipmentId),
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
      }),
    onSuccess: (res) => navigate(`/faults/${res.id}`),
    onError: () => setError('장애 등록에 실패했습니다.'),
  })

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">장애 등록</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">설비 *</label>
          <select
            required
            value={form.equipmentId}
            onChange={(e) => setForm((f) => ({ ...f, equipmentId: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">설비 선택</option>
            {equipmentPage?.content.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.equipmentNo})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">제목 *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="장애 제목"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={4}
            placeholder="장애 상세 설명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">긴급도</label>
          <select
            value={form.severity}
            onChange={(e) =>
              setForm((f) => ({ ...f, severity: e.target.value as FaultSeverity }))
            }
            className="w-full border rounded px-3 py-2"
          >
            {(Object.keys(FAULT_SEVERITY_LABELS) as FaultSeverity[]).map((s) => (
              <option key={s} value={s}>
                {FAULT_SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? '등록 중...' : '등록'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/faults')}
            className="flex-1 border py-2 rounded hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/pages/fault/
git commit -m "feat(fault): FaultListPage + FaultCreatePage"
```

---

### Task 6: FaultDetailPage + FaultStatusModal + 라우터 등록

**Files:**
- Create: `frontend/src/pages/fault/FaultDetailPage.tsx`
- Create: `frontend/src/pages/fault/FaultStatusModal.tsx`
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Consumes: `faultApi.getById`, `faultApi.changeStatus`, `faultApi.delete`, `NEXT_STATUS_MAP` from `../types/fault`
- Produces: `/faults/:id` 상세 페이지, 상태변경 모달, 라우터에 `/faults`, `/faults/new`, `/faults/:id` 등록

- [ ] **Step 1: FaultStatusModal 작성**

`frontend/src/pages/fault/FaultStatusModal.tsx`:
```tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import {
  FAULT_STATUS_LABELS,
  NEXT_STATUS_MAP,
  type Fault,
  type FaultStatus,
} from '../../types/fault'

interface Props {
  fault: Fault
  onClose: () => void
  onSuccess: () => void
}

export default function FaultStatusModal({ fault, onClose, onSuccess }: Props) {
  const nextStatuses = NEXT_STATUS_MAP[fault.status] ?? []
  const [selectedStatus, setSelectedStatus] = useState<FaultStatus>(
    nextStatuses[0] ?? fault.status,
  )
  const [reason, setReason] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      faultApi.changeStatus(fault.id, {
        status: selectedStatus,
        reason: reason || undefined,
      }),
    onSuccess,
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">상태 변경</h2>
        <p className="text-sm text-gray-500 mb-4">
          현재 상태: <strong>{FAULT_STATUS_LABELS[fault.status]}</strong>
        </p>

        {nextStatuses.length === 0 ? (
          <p className="text-gray-500 mb-4">더 이상 변경 가능한 상태가 없습니다.</p>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">변경할 상태</label>
              <div className="flex gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStatus(s)}
                    className={`px-3 py-2 rounded border ${
                      selectedStatus === s
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-gray-300'
                    }`}
                  >
                    {FAULT_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">사유</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="상태 변경 사유 (선택)"
              />
            </div>
          </>
        )}

        <div className="flex gap-3">
          {nextStatuses.length > 0 && (
            <button
              onClick={() => mutate()}
              disabled={isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '변경 중...' : '변경'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border py-2 rounded hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: FaultDetailPage 작성**

`frontend/src/pages/fault/FaultDetailPage.tsx`:
```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import {
  FAULT_SEVERITY_LABELS,
  FAULT_SEVERITY_COLORS,
  FAULT_STATUS_LABELS,
  FAULT_STATUS_COLORS,
} from '../../types/fault'
import FaultStatusModal from './FaultStatusModal'

export default function FaultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showStatusModal, setShowStatusModal] = useState(false)

  const { data: fault, isLoading } = useQuery({
    queryKey: ['fault', id],
    queryFn: () => faultApi.getById(Number(id)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => faultApi.delete(Number(id)),
    onSuccess: () => navigate('/faults'),
  })

  if (isLoading) return <p className="p-6">로딩 중...</p>
  if (!fault) return <p className="p-6">장애를 찾을 수 없습니다.</p>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{fault.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{fault.equipmentName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStatusModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            상태변경
          </button>
          <button
            onClick={() => {
              if (confirm('삭제하시겠습니까?')) deleteMutation.mutate()
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
        <div>
          <span className="text-sm text-gray-500">상태</span>
          <p>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${FAULT_STATUS_COLORS[fault.status]}`}
            >
              {FAULT_STATUS_LABELS[fault.status]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">긴급도</span>
          <p>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${FAULT_SEVERITY_COLORS[fault.severity]}`}
            >
              {FAULT_SEVERITY_LABELS[fault.severity]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">등록자</span>
          <p className="font-medium">{fault.reportedByName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">담당자</span>
          <p className="font-medium">{fault.assignedToName ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">등록일</span>
          <p>{new Date(fault.createdAt).toLocaleString('ko-KR')}</p>
        </div>
        {fault.resolvedAt && (
          <div>
            <span className="text-sm text-gray-500">해결일</span>
            <p>{new Date(fault.resolvedAt).toLocaleString('ko-KR')}</p>
          </div>
        )}
      </div>

      {fault.description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">설명</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{fault.description}</p>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">상태변경 이력</h2>
        {fault.statusHistories.length === 0 ? (
          <p className="text-gray-500">이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {fault.statusHistories.map((h) => (
              <li key={h.id} className="border-l-2 border-blue-400 pl-4 py-1">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${FAULT_STATUS_COLORS[h.fromStatus]}`}
                  >
                    {FAULT_STATUS_LABELS[h.fromStatus]}
                  </span>
                  <span>→</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${FAULT_STATUS_COLORS[h.toStatus]}`}
                  >
                    {FAULT_STATUS_LABELS[h.toStatus]}
                  </span>
                  <span className="text-gray-500">by {h.changedByName}</span>
                  <span className="text-gray-400">
                    {new Date(h.changedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                {h.reason && <p className="text-sm text-gray-600 mt-1">{h.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showStatusModal && (
        <FaultStatusModal
          fault={fault}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false)
            queryClient.invalidateQueries({ queryKey: ['fault', id] })
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 라우터에 장애 페이지 등록**

`frontend/src/router/index.tsx` — 기존 파일에 import 3개 + route 3개 추가:

```typescript
import { createBrowserRouter } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import NotFoundPage from '../pages/NotFoundPage'
import EquipmentListPage from '../pages/equipment/EquipmentListPage'
import EquipmentFormPage from '../pages/equipment/EquipmentFormPage'
import EquipmentDetailPage from '../pages/equipment/EquipmentDetailPage'
import InspectionChecklistPage from '../pages/inspection/InspectionChecklistPage'
import InspectionScheduleListPage from '../pages/inspection/InspectionScheduleListPage'
import InspectionScheduleFormPage from '../pages/inspection/InspectionScheduleFormPage'
import InspectionDetailPage from '../pages/inspection/InspectionDetailPage'
import FaultListPage from '../pages/fault/FaultListPage'
import FaultCreatePage from '../pages/fault/FaultCreatePage'
import FaultDetailPage from '../pages/fault/FaultDetailPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/equipments', element: <EquipmentListPage /> },
  { path: '/equipments/new', element: <EquipmentFormPage /> },
  { path: '/equipments/:id', element: <EquipmentDetailPage /> },
  { path: '/equipments/:id/edit', element: <EquipmentFormPage /> },
  { path: '/inspection-checklists', element: <InspectionChecklistPage /> },
  { path: '/inspection-schedules', element: <InspectionScheduleListPage /> },
  { path: '/inspection-schedules/new', element: <InspectionScheduleFormPage /> },
  { path: '/inspections/:id', element: <InspectionDetailPage /> },
  { path: '/faults', element: <FaultListPage /> },
  { path: '/faults/new', element: <FaultCreatePage /> },
  { path: '/faults/:id', element: <FaultDetailPage /> },
  { path: '*', element: <NotFoundPage /> },
])

export default router
```

- [ ] **Step 4: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 5: 전체 백엔드 테스트 실행**

```bash
cd backend && ./gradlew test
```
Expected: BUILD SUCCESSFUL, 모든 기존 테스트 포함 통과

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/
git commit -m "feat(fault): FaultDetailPage + FaultStatusModal + 라우터 등록"
```

---

## Self-Review

**Spec 커버리지:**
| 요구사항 | Task |
|---|---|
| Fault CRUD API | Task 2 |
| 상태전이 (REPORTED→CONFIRMED→IN_PROGRESS→RESOLVED→CLOSED) | Task 1 (엔티티 validateTransition) + Task 2 (changeStatus endpoint) |
| 상태변경 이력 (FaultStatusHistory) | Task 1 (엔티티) + Task 2 (서비스 내 생성) |
| 담당자 배정 (assign endpoint) | Task 2 |
| QueryDSL 검색 (equipmentId/status/severity/assigneeId/from/to) | Task 1 |
| 점검결과 → Fault 자동 생성 | Task 3 |
| Frontend 타입 + API | Task 4 |
| FaultListPage (필터/페이지네이션) | Task 5 |
| FaultCreatePage | Task 5 |
| FaultDetailPage + 이력 | Task 6 |
| FaultStatusModal | Task 6 |
| 라우터 등록 | Task 6 |

**타입 일관성 확인:**
- `FaultService.createFromInspectionResult(InspectionResult, User)` → Task 3에서 그대로 호출 ✓
- `faultApi` 메서드명 Task 4~6에서 일관 ✓
- `NEXT_STATUS_MAP` Task 4에서 정의, Task 6에서 import ✓
- `SpringPage<Fault>` Task 4에서 equipment.ts에서 import, 재정의 없음 ✓