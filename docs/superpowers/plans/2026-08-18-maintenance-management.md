# 유지보수관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WBS 7.0~7.4 — 유지보수 작업 CRUD + 상태머신(시작/완료/취소) + 작업이력 기록 + Fault 반자동 연동 백엔드 API + 프론트엔드 3페이지 구현

**Architecture:** Equipment/Inspection/Fault 도메인 패턴 동일 — Entity→Service→Controller, QueryDSL for 검색, 상태전이 규칙을 Entity 내부에 캡슐화. 브랜치: `feat/maintenance` (백엔드), `feat/maintenance-frontend` (프론트엔드).

**Tech Stack:** Spring Boot 4.1, Spring Security+JWT, QueryDSL, React+TypeScript+Vite, TanStack Query v5, Tailwind CSS

## Global Constraints

- 패키지 루트: `com.factorycare.backend.domain.maintenance`
- 테스트: `@ActiveProfiles("test")`, H2 in-memory, `tools.jackson.databind.ObjectMapper`, `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`
- Entity: `@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)` + `@Builder` 생성자
- DTO: Java record + `static from(Entity)` 팩토리
- Controller: 생성자 주입, `@PreAuthorize` 역할 제어
- Frontend API: `axiosInstance` 사용, baseURL `/api` (기존 패턴)
- `GlobalExceptionHandler`: `IllegalStateException` → **409 CONFLICT**, `IllegalArgumentException` → 400
- `SpringPage<T>` 타입: `frontend/src/types/equipment.ts`에 이미 정의됨 — 재정의 금지, import해서 사용

---

### Task 1: 브랜치 생성 + 엔티티 + QueryDSL 리포지토리

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenanceStatus.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenanceType.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenancePriority.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenanceHistoryType.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenanceTask.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenanceHistory.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceRepository.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceRepositoryCustom.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceRepositoryImpl.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceHistoryRepository.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceSearchCondition.java`

**Interfaces:**
- Produces: `MaintenanceTask` (id, taskNo, equipment, fault, title, description, taskType, priority, assignee, scheduledDate, status, createdBy, completedAt, histories, createdAt), `MaintenanceHistory` (id, maintenanceTask, recordedBy, type, content, durationMinutes, recordedAt)

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feat/maintenance
```

- [ ] **Step 2: Enum 4개 작성**

`MaintenanceStatus.java`:
```java
package com.factorycare.backend.domain.maintenance.entity;
public enum MaintenanceStatus { PENDING, IN_PROGRESS, COMPLETED, CANCELLED }
```

`MaintenanceType.java`:
```java
package com.factorycare.backend.domain.maintenance.entity;
public enum MaintenanceType { REPAIR, PREVENTIVE, INSPECTION_FOLLOWUP, OTHER }
```

`MaintenancePriority.java`:
```java
package com.factorycare.backend.domain.maintenance.entity;
public enum MaintenancePriority { LOW, MEDIUM, HIGH, CRITICAL }
```

`MaintenanceHistoryType.java`:
```java
package com.factorycare.backend.domain.maintenance.entity;
public enum MaintenanceHistoryType { START, COMPLETE }
```

- [ ] **Step 3: MaintenanceTask 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenanceTask.java`:
```java
package com.factorycare.backend.domain.maintenance.entity;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "maintenance_tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MaintenanceTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String taskNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fault_id")
    private Fault fault;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenanceType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenancePriority priority = MaintenancePriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenanceStatus status = MaintenanceStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    private LocalDateTime completedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "maintenanceTask", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("recordedAt ASC")
    private List<MaintenanceHistory> histories = new ArrayList<>();

    @Builder
    public MaintenanceTask(String taskNo, Equipment equipment, Fault fault,
                           String title, String description, MaintenanceType taskType,
                           MaintenancePriority priority, User assignee,
                           LocalDate scheduledDate, User createdBy) {
        this.taskNo = taskNo;
        this.equipment = equipment;
        this.fault = fault;
        this.title = title;
        this.description = description;
        this.taskType = taskType != null ? taskType : MaintenanceType.REPAIR;
        this.priority = priority != null ? priority : MaintenancePriority.MEDIUM;
        this.assignee = assignee;
        this.scheduledDate = scheduledDate;
        this.createdBy = createdBy;
    }

    public void update(String title, String description, MaintenanceType taskType,
                       MaintenancePriority priority, LocalDate scheduledDate) {
        if (title != null) this.title = title;
        if (description != null) this.description = description;
        if (taskType != null) this.taskType = taskType;
        if (priority != null) this.priority = priority;
        if (scheduledDate != null) this.scheduledDate = scheduledDate;
    }

    public void assignTo(User user) {
        this.assignee = user;
    }

    public void start() {
        if (this.status != MaintenanceStatus.PENDING) {
            throw new IllegalStateException("PENDING 상태에서만 시작할 수 있습니다.");
        }
        this.status = MaintenanceStatus.IN_PROGRESS;
    }

    public void complete() {
        if (this.status != MaintenanceStatus.IN_PROGRESS) {
            throw new IllegalStateException("IN_PROGRESS 상태에서만 완료할 수 있습니다.");
        }
        this.status = MaintenanceStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (this.status == MaintenanceStatus.COMPLETED) {
            throw new IllegalStateException("완료된 작업은 취소할 수 없습니다.");
        }
        if (this.status == MaintenanceStatus.CANCELLED) {
            throw new IllegalStateException("이미 취소된 작업입니다.");
        }
        this.status = MaintenanceStatus.CANCELLED;
    }
}
```

- [ ] **Step 4: MaintenanceHistory 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/maintenance/entity/MaintenanceHistory.java`:
```java
package com.factorycare.backend.domain.maintenance.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "maintenance_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_task_id", nullable = false)
    private MaintenanceTask maintenanceTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by_id", nullable = false)
    private User recordedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaintenanceHistoryType type;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private Integer durationMinutes;

    @Column(nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();

    @Builder
    public MaintenanceHistory(MaintenanceTask maintenanceTask, User recordedBy,
                              MaintenanceHistoryType type, String content,
                              Integer durationMinutes) {
        this.maintenanceTask = maintenanceTask;
        this.recordedBy = recordedBy;
        this.type = type;
        this.content = content;
        this.durationMinutes = durationMinutes;
    }
}
```

- [ ] **Step 5: QueryDSL 리포지토리 작성**

`MaintenanceSearchCondition.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import java.time.LocalDate;

public record MaintenanceSearchCondition(
    Long equipmentId,
    MaintenanceStatus status,
    MaintenancePriority priority,
    Long assigneeId,
    Long faultId,
    LocalDate from,
    LocalDate to
) {}
```

`MaintenanceRepositoryCustom.java`:
```java
package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.dto.MaintenanceSearchCondition;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MaintenanceRepositoryCustom {
    Page<MaintenanceTask> search(MaintenanceSearchCondition cond, Pageable pageable);
}
```

`MaintenanceRepositoryImpl.java`:
```java
package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.dto.MaintenanceSearchCondition;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public class MaintenanceRepositoryImpl implements MaintenanceRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public MaintenanceRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<MaintenanceTask> search(MaintenanceSearchCondition cond, Pageable pageable) {
        QMaintenanceTask qm = QMaintenanceTask.maintenanceTask;

        List<MaintenanceTask> content = queryFactory
            .selectFrom(qm)
            .where(
                equipmentEq(qm, cond.equipmentId()),
                statusEq(qm, cond.status()),
                priorityEq(qm, cond.priority()),
                assigneeEq(qm, cond.assigneeId()),
                faultEq(qm, cond.faultId()),
                dateFrom(qm, cond.from()),
                dateTo(qm, cond.to())
            )
            .orderBy(qm.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory
            .select(qm.count()).from(qm)
            .where(
                equipmentEq(qm, cond.equipmentId()),
                statusEq(qm, cond.status()),
                priorityEq(qm, cond.priority()),
                assigneeEq(qm, cond.assigneeId()),
                faultEq(qm, cond.faultId()),
                dateFrom(qm, cond.from()),
                dateTo(qm, cond.to())
            ).fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentEq(QMaintenanceTask qm, Long id) {
        return id != null ? qm.equipment.id.eq(id) : null;
    }
    private BooleanExpression statusEq(QMaintenanceTask qm, MaintenanceStatus s) {
        return s != null ? qm.status.eq(s) : null;
    }
    private BooleanExpression priorityEq(QMaintenanceTask qm, MaintenancePriority p) {
        return p != null ? qm.priority.eq(p) : null;
    }
    private BooleanExpression assigneeEq(QMaintenanceTask qm, Long id) {
        return id != null ? qm.assignee.id.eq(id) : null;
    }
    private BooleanExpression faultEq(QMaintenanceTask qm, Long id) {
        return id != null ? qm.fault.id.eq(id) : null;
    }
    private BooleanExpression dateFrom(QMaintenanceTask qm, LocalDate from) {
        return from != null ? qm.scheduledDate.goe(from) : null;
    }
    private BooleanExpression dateTo(QMaintenanceTask qm, LocalDate to) {
        return to != null ? qm.scheduledDate.loe(to) : null;
    }
}
```

`MaintenanceRepository.java`:
```java
package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface MaintenanceRepository extends JpaRepository<MaintenanceTask, Long>, MaintenanceRepositoryCustom {
    @Query("SELECT COUNT(m) FROM MaintenanceTask m WHERE m.createdAt >= :start AND m.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
```

`MaintenanceHistoryRepository.java`:
```java
package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceHistoryRepository extends JpaRepository<MaintenanceHistory, Long> {}
```

- [ ] **Step 6: 컴파일 + Q클래스 생성 확인**

```bash
cd backend && ./gradlew compileJava
```
Expected: BUILD SUCCESSFUL (QMaintenanceTask, QMaintenanceHistory 자동 생성됨)

- [ ] **Step 7: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/maintenance/
git commit -m "feat(maintenance): MaintenanceTask/History 엔티티 + QueryDSL 리포지토리"
```

---

### Task 2: DTO + Service + Controller + 통합 테스트

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceHistoryResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceCreateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceUpdateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceAssignRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceStartRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/dto/MaintenanceCompleteRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/service/MaintenanceService.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/maintenance/controller/MaintenanceController.java`
- Create: `backend/src/test/java/com/factorycare/backend/domain/maintenance/MaintenanceControllerTest.java`

**Interfaces:**
- Consumes: `MaintenanceRepository`, `EquipmentRepository.findByIdAndActiveTrue(Long)`, `UserRepository.findById(Long)`, `FaultRepository.findById(Long)`
- Produces: REST API endpoints (GET|POST `/api/maintenance`, GET|PATCH|DELETE `/api/maintenance/{id}`, PATCH `/api/maintenance/{id}/assign`, POST `/api/maintenance/{id}/start|complete`, PATCH `/api/maintenance/{id}/cancel`)

- [ ] **Step 1: 실패 테스트 작성**

`backend/src/test/java/com/factorycare/backend/domain/maintenance/MaintenanceControllerTest.java`:
```java
package com.factorycare.backend.domain.maintenance;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
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

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MaintenanceControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;
    User worker, manager;
    Equipment equipment;

    @BeforeEach
    void setUp() {
        maintenanceRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
            .loginId("admin01").password(passwordEncoder.encode("pw"))
            .name("관리자").role(UserRole.ADMIN).build());
        manager = userRepository.save(User.builder()
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
    @DisplayName("MANAGER가 작업 생성 → 201, taskNo MT- 로 시작")
    void create_asManager() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "title", "컨베이어 수리",
            "taskType", "REPAIR"
        );
        mockMvc.perform(post("/api/maintenance")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.taskNo", startsWith("MT-")))
            .andExpect(jsonPath("$.equipmentName").value("컨베이어"))
            .andExpect(jsonPath("$.priority").value("MEDIUM"));
    }

    @Test
    @DisplayName("WORKER가 작업 생성 시도 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "title", "테스트",
            "taskType", "REPAIR"
        );
        mockMvc.perform(post("/api/maintenance")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("작업 목록 페이징 조회")
    void search() throws Exception {
        maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment).title("작업1")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(get("/api/maintenance")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    @DisplayName("작업 시작 → IN_PROGRESS + History[START] 1건")
    void start() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        var body = Map.of("content", "모터 분해 시작");
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
            .andExpect(jsonPath("$.histories.length()").value(1))
            .andExpect(jsonPath("$.histories[0].type").value("START"))
            .andExpect(jsonPath("$.histories[0].content").value("모터 분해 시작"));
    }

    @Test
    @DisplayName("작업 완료 → COMPLETED + History[COMPLETE] + completedAt + durationMinutes")
    void complete() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-002").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "시작"))))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "수리 완료", "durationMinutes", 90))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.histories.length()").value(2))
            .andExpect(jsonPath("$.histories[1].type").value("COMPLETE"))
            .andExpect(jsonPath("$.histories[1].durationMinutes").value(90))
            .andExpect(jsonPath("$.completedAt").isNotEmpty());
    }

    @Test
    @DisplayName("PENDING → complete 직접 시도 → 409")
    void complete_fromPending_409() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-003").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "결과"))))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("COMPLETED 작업 취소 → 409")
    void cancel_completed_409() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-004").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "시작"))))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "완료"))))
            .andExpect(status().isOk());

        mockMvc.perform(patch("/api/maintenance/" + task.getId() + "/cancel")
                .header("Authorization", managerToken))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("MANAGER가 담당자 배정")
    void assign() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-005").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(patch("/api/maintenance/" + task.getId() + "/assign")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("assigneeId", worker.getId()))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assigneeName").value("작업자"));
    }

    @Test
    @DisplayName("ADMIN이 PENDING 작업 삭제 → 204")
    void delete_pending_asAdmin() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-006").equipment(equipment).title("삭제대상")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());

        mockMvc.perform(delete("/api/maintenance/" + task.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd backend && ./gradlew test --tests "*.MaintenanceControllerTest" 2>&1 | tail -10
```
Expected: FAILED (컨트롤러/서비스 없음)

- [ ] **Step 3: DTO 7개 작성**

`MaintenanceHistoryResponse.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceHistory;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceHistoryType;
import java.time.LocalDateTime;

public record MaintenanceHistoryResponse(
    Long id,
    MaintenanceHistoryType type,
    String recordedByName,
    String content,
    Integer durationMinutes,
    LocalDateTime recordedAt
) {
    public static MaintenanceHistoryResponse from(MaintenanceHistory h) {
        return new MaintenanceHistoryResponse(
            h.getId(), h.getType(), h.getRecordedBy().getName(),
            h.getContent(), h.getDurationMinutes(), h.getRecordedAt()
        );
    }
}
```

`MaintenanceResponse.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MaintenanceResponse(
    Long id,
    String taskNo,
    Long equipmentId, String equipmentName,
    Long faultId,
    String title, String description,
    MaintenanceType taskType,
    MaintenancePriority priority,
    Long assigneeId, String assigneeName,
    LocalDate scheduledDate,
    MaintenanceStatus status,
    String createdByName,
    LocalDateTime completedAt,
    List<MaintenanceHistoryResponse> histories,
    LocalDateTime createdAt
) {
    public static MaintenanceResponse from(MaintenanceTask m) {
        return new MaintenanceResponse(
            m.getId(), m.getTaskNo(),
            m.getEquipment().getId(), m.getEquipment().getName(),
            m.getFault() != null ? m.getFault().getId() : null,
            m.getTitle(), m.getDescription(),
            m.getTaskType(), m.getPriority(),
            m.getAssignee() != null ? m.getAssignee().getId() : null,
            m.getAssignee() != null ? m.getAssignee().getName() : null,
            m.getScheduledDate(), m.getStatus(),
            m.getCreatedBy().getName(),
            m.getCompletedAt(),
            m.getHistories().stream().map(MaintenanceHistoryResponse::from).toList(),
            m.getCreatedAt()
        );
    }
}
```

`MaintenanceCreateRequest.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record MaintenanceCreateRequest(
    @NotNull Long equipmentId,
    Long faultId,
    @NotBlank String title,
    String description,
    @NotNull MaintenanceType taskType,
    MaintenancePriority priority,
    Long assigneeId,
    LocalDate scheduledDate
) {}
```

`MaintenanceUpdateRequest.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import java.time.LocalDate;

public record MaintenanceUpdateRequest(
    String title, String description,
    MaintenanceType taskType, MaintenancePriority priority,
    LocalDate scheduledDate
) {}
```

`MaintenanceAssignRequest.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import jakarta.validation.constraints.NotNull;

public record MaintenanceAssignRequest(@NotNull Long assigneeId) {}
```

`MaintenanceStartRequest.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import jakarta.validation.constraints.NotBlank;

public record MaintenanceStartRequest(@NotBlank String content) {}
```

`MaintenanceCompleteRequest.java`:
```java
package com.factorycare.backend.domain.maintenance.dto;

import jakarta.validation.constraints.NotBlank;

public record MaintenanceCompleteRequest(
    @NotBlank String content,
    Integer durationMinutes
) {}
```

- [ ] **Step 4: MaintenanceService 작성**

`backend/src/main/java/com/factorycare/backend/domain/maintenance/service/MaintenanceService.java`:
```java
package com.factorycare.backend.domain.maintenance.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.maintenance.dto.*;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;
    private final FaultRepository faultRepository;

    public MaintenanceService(MaintenanceRepository maintenanceRepository,
                              EquipmentRepository equipmentRepository,
                              UserRepository userRepository,
                              FaultRepository faultRepository) {
        this.maintenanceRepository = maintenanceRepository;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
        this.faultRepository = faultRepository;
    }

    @Transactional(readOnly = true)
    public Page<MaintenanceResponse> search(MaintenanceSearchCondition cond, Pageable pageable) {
        return maintenanceRepository.search(cond, pageable).map(MaintenanceResponse::from);
    }

    @Transactional(readOnly = true)
    public MaintenanceResponse findById(Long id) {
        return MaintenanceResponse.from(getTask(id));
    }

    @Transactional
    public MaintenanceResponse create(MaintenanceCreateRequest req, Long creatorId) {
        Equipment equipment = equipmentRepository.findByIdAndActiveTrue(req.equipmentId())
            .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다."));
        User creator = getUser(creatorId);
        Fault fault = req.faultId() != null
            ? faultRepository.findById(req.faultId())
                .orElseThrow(() -> new IllegalArgumentException("장애를 찾을 수 없습니다."))
            : null;
        User assignee = req.assigneeId() != null ? getUser(req.assigneeId()) : null;

        MaintenanceTask task = MaintenanceTask.builder()
            .taskNo(generateTaskNo())
            .equipment(equipment).fault(fault)
            .title(req.title()).description(req.description())
            .taskType(req.taskType()).priority(req.priority())
            .assignee(assignee).scheduledDate(req.scheduledDate())
            .createdBy(creator).build();

        return MaintenanceResponse.from(maintenanceRepository.save(task));
    }

    @Transactional
    public MaintenanceResponse update(Long id, MaintenanceUpdateRequest req) {
        MaintenanceTask task = getTask(id);
        task.update(req.title(), req.description(), req.taskType(), req.priority(), req.scheduledDate());
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse assign(Long id, MaintenanceAssignRequest req) {
        MaintenanceTask task = getTask(id);
        task.assignTo(getUser(req.assigneeId()));
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse start(Long id, MaintenanceStartRequest req, Long userId) {
        MaintenanceTask task = getTask(id);
        task.start();
        MaintenanceHistory history = MaintenanceHistory.builder()
            .maintenanceTask(task).recordedBy(getUser(userId))
            .type(MaintenanceHistoryType.START).content(req.content())
            .build();
        task.getHistories().add(history);
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse complete(Long id, MaintenanceCompleteRequest req, Long userId) {
        MaintenanceTask task = getTask(id);
        task.complete();
        MaintenanceHistory history = MaintenanceHistory.builder()
            .maintenanceTask(task).recordedBy(getUser(userId))
            .type(MaintenanceHistoryType.COMPLETE).content(req.content())
            .durationMinutes(req.durationMinutes())
            .build();
        task.getHistories().add(history);
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public MaintenanceResponse cancel(Long id) {
        MaintenanceTask task = getTask(id);
        task.cancel();
        return MaintenanceResponse.from(task);
    }

    @Transactional
    public void delete(Long id) {
        MaintenanceTask task = getTask(id);
        if (task.getStatus() == MaintenanceStatus.COMPLETED) {
            throw new IllegalArgumentException("완료된 작업은 삭제할 수 없습니다.");
        }
        maintenanceRepository.delete(task);
    }

    private String generateTaskNo() {
        int year = LocalDate.now().getYear();
        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(year + 1, 1, 1).atStartOfDay();
        long count = maintenanceRepository.countByCreatedAtBetween(start, end);
        return String.format("MT-%d-%03d", year, count + 1);
    }

    private MaintenanceTask getTask(Long id) {
        return maintenanceRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("유지보수 작업을 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
```

- [ ] **Step 5: MaintenanceController 작성**

`backend/src/main/java/com/factorycare/backend/domain/maintenance/controller/MaintenanceController.java`:
```java
package com.factorycare.backend.domain.maintenance.controller;

import com.factorycare.backend.domain.maintenance.dto.*;
import com.factorycare.backend.domain.maintenance.entity.MaintenancePriority;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.service.MaintenanceService;
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
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    private final MaintenanceService service;

    public MaintenanceController(MaintenanceService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<MaintenanceResponse>> search(
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) MaintenanceStatus status,
            @RequestParam(required = false) MaintenancePriority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long faultId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(service.search(
            new MaintenanceSearchCondition(equipmentId, status, priority, assigneeId, faultId, from, to), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> create(
            @Valid @RequestBody MaintenanceCreateRequest req,
            @AuthenticationPrincipal Long userId) {
        MaintenanceResponse res = service.create(req, userId);
        return ResponseEntity.created(URI.create("/api/maintenance/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> update(
            @PathVariable Long id,
            @RequestBody MaintenanceUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> assign(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceAssignRequest req) {
        return ResponseEntity.ok(service.assign(id, req));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<MaintenanceResponse> start(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceStartRequest req,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(service.start(id, req, userId));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<MaintenanceResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody MaintenanceCompleteRequest req,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(service.complete(id, req, userId));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<MaintenanceResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(service.cancel(id));
    }
}
```

- [ ] **Step 6: 테스트 실행 → 전체 통과 확인**

```bash
cd backend && ./gradlew test --tests "*.MaintenanceControllerTest"
```
Expected: BUILD SUCCESSFUL, 8 tests passed

- [ ] **Step 7: 전체 기존 테스트 회귀 확인**

```bash
cd backend && ./gradlew test
```
Expected: BUILD SUCCESSFUL, 모든 기존 테스트 포함 통과

- [ ] **Step 8: 커밋**

```bash
git add backend/src/
git commit -m "feat(maintenance): 유지보수 CRUD + 상태머신 + 이력 API"
```

---

### Task 3: feat/maintenance-frontend 브랜치 + Frontend 타입 + API 클라이언트

**Files:**
- Create: `frontend/src/types/maintenance.ts`
- Create: `frontend/src/api/maintenance.ts`

**Interfaces:**
- Consumes: `SpringPage<T>` from `../types/equipment` (재사용)
- Produces: `maintenanceApi` (search, getById, create, update, assign, start, complete, cancel, delete), 타입 상수 `MAINTENANCE_STATUS_LABELS/COLORS`, `MAINTENANCE_PRIORITY_LABELS/COLORS`, `MAINTENANCE_TYPE_LABELS`

- [ ] **Step 1: feat/maintenance-frontend 브랜치 생성**

```bash
git checkout main && git checkout -b feat/maintenance-frontend
```

- [ ] **Step 2: 타입 정의 작성**

`frontend/src/types/maintenance.ts`:
```typescript
import type { SpringPage } from './equipment'

export type { SpringPage }

export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MaintenanceType = 'REPAIR' | 'PREVENTIVE' | 'INSPECTION_FOLLOWUP' | 'OTHER'
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type MaintenanceHistoryType = 'START' | 'COMPLETE'

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
}

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  CRITICAL: '긴급',
}

export const MAINTENANCE_PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  REPAIR: '수리',
  PREVENTIVE: '예방정비',
  INSPECTION_FOLLOWUP: '점검후속',
  OTHER: '기타',
}

export interface MaintenanceHistory {
  id: number
  type: MaintenanceHistoryType
  recordedByName: string
  content: string
  durationMinutes: number | null
  recordedAt: string
}

export interface MaintenanceTask {
  id: number
  taskNo: string
  equipmentId: number
  equipmentName: string
  faultId: number | null
  title: string
  description: string | null
  taskType: MaintenanceType
  priority: MaintenancePriority
  assigneeId: number | null
  assigneeName: string | null
  scheduledDate: string | null
  status: MaintenanceStatus
  createdByName: string
  completedAt: string | null
  histories: MaintenanceHistory[]
  createdAt: string
}

export interface MaintenanceCreateRequest {
  equipmentId: number
  faultId?: number
  title: string
  description?: string
  taskType: MaintenanceType
  priority?: MaintenancePriority
  assigneeId?: number
  scheduledDate?: string
}

export interface MaintenanceUpdateRequest {
  title?: string
  description?: string
  taskType?: MaintenanceType
  priority?: MaintenancePriority
  scheduledDate?: string
}

export interface MaintenanceAssignRequest {
  assigneeId: number
}

export interface MaintenanceStartRequest {
  content: string
}

export interface MaintenanceCompleteRequest {
  content: string
  durationMinutes?: number
}

export interface MaintenanceSearchParams {
  equipmentId?: number
  status?: MaintenanceStatus
  priority?: MaintenancePriority
  assigneeId?: number
  faultId?: number
  from?: string
  to?: string
  page?: number
  size?: number
}
```

- [ ] **Step 3: API 클라이언트 작성**

`frontend/src/api/maintenance.ts`:
```typescript
import axiosInstance from './axiosInstance'
import type {
  MaintenanceTask,
  MaintenanceCreateRequest,
  MaintenanceUpdateRequest,
  MaintenanceAssignRequest,
  MaintenanceStartRequest,
  MaintenanceCompleteRequest,
  MaintenanceSearchParams,
  SpringPage,
} from '../types/maintenance'

export const maintenanceApi = {
  search: (params?: MaintenanceSearchParams) =>
    axiosInstance.get<SpringPage<MaintenanceTask>>('/maintenance', { params }).then(r => r.data),

  getById: (id: number) =>
    axiosInstance.get<MaintenanceTask>(`/maintenance/${id}`).then(r => r.data),

  create: (data: MaintenanceCreateRequest) =>
    axiosInstance.post<MaintenanceTask>('/maintenance', data).then(r => r.data),

  update: (id: number, data: MaintenanceUpdateRequest) =>
    axiosInstance.patch<MaintenanceTask>(`/maintenance/${id}`, data).then(r => r.data),

  assign: (id: number, data: MaintenanceAssignRequest) =>
    axiosInstance.patch<MaintenanceTask>(`/maintenance/${id}/assign`, data).then(r => r.data),

  start: (id: number, data: MaintenanceStartRequest) =>
    axiosInstance.post<MaintenanceTask>(`/maintenance/${id}/start`, data).then(r => r.data),

  complete: (id: number, data: MaintenanceCompleteRequest) =>
    axiosInstance.post<MaintenanceTask>(`/maintenance/${id}/complete`, data).then(r => r.data),

  cancel: (id: number) =>
    axiosInstance.patch<MaintenanceTask>(`/maintenance/${id}/cancel`).then(r => r.data),

  delete: (id: number) =>
    axiosInstance.delete(`/maintenance/${id}`),
}
```

- [ ] **Step 4: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/types/maintenance.ts frontend/src/api/maintenance.ts
git commit -m "feat(maintenance): 프론트엔드 타입 + API 클라이언트"
```

---

### Task 4: MaintenanceListPage + MaintenanceCreatePage

**Files:**
- Create: `frontend/src/pages/maintenance/MaintenanceListPage.tsx`
- Create: `frontend/src/pages/maintenance/MaintenanceCreatePage.tsx`

**Interfaces:**
- Consumes: `maintenanceApi.search`, `maintenanceApi.create`, `equipmentApi.search`, `faultApi.getById`
- Produces: `/maintenance` 목록 페이지, `/maintenance/new` 등록 페이지 (faultId 쿼리파라미터 지원)

- [ ] **Step 1: MaintenanceListPage 작성**

`frontend/src/pages/maintenance/MaintenanceListPage.tsx`:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { maintenanceApi } from '../../api/maintenance'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus,
  type MaintenancePriority,
} from '../../types/maintenance'

export default function MaintenanceListPage() {
  const [status, setStatus] = useState<MaintenanceStatus | ''>('')
  const [priority, setPriority] = useState<MaintenancePriority | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', { status, priority, page }],
    queryFn: () =>
      maintenanceApi.search({
        status: status || undefined,
        priority: priority || undefined,
        page,
      }),
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">유지보수 관리</h1>
        <Link
          to="/maintenance/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          작업 등록
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as MaintenanceStatus | ''); setPage(0) }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 상태</option>
          {(Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]).map(s => (
            <option key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value as MaintenancePriority | ''); setPage(0) }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 우선순위</option>
          {(Object.keys(MAINTENANCE_PRIORITY_LABELS) as MaintenancePriority[]).map(p => (
            <option key={p} value={p}>{MAINTENANCE_PRIORITY_LABELS[p]}</option>
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
                <th className="border border-gray-200 p-3 text-left">작업번호</th>
                <th className="border border-gray-200 p-3 text-left">제목</th>
                <th className="border border-gray-200 p-3 text-left">설비</th>
                <th className="border border-gray-200 p-3 text-left">유형</th>
                <th className="border border-gray-200 p-3 text-left">우선순위</th>
                <th className="border border-gray-200 p-3 text-left">상태</th>
                <th className="border border-gray-200 p-3 text-left">담당자</th>
                <th className="border border-gray-200 p-3 text-left">예정일</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map(task => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-3 font-mono text-sm">{task.taskNo}</td>
                  <td className="border border-gray-200 p-3">
                    <Link to={`/maintenance/${task.id}`} className="text-blue-600 hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="border border-gray-200 p-3">{task.equipmentName}</td>
                  <td className="border border-gray-200 p-3">{MAINTENANCE_TYPE_LABELS[task.taskType]}</td>
                  <td className="border border-gray-200 p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_PRIORITY_COLORS[task.priority]}`}>
                      {MAINTENANCE_PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_STATUS_COLORS[task.status]}`}>
                      {MAINTENANCE_STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">{task.assigneeName ?? '-'}</td>
                  <td className="border border-gray-200 p-3">{task.scheduledDate ?? '-'}</td>
                </tr>
              ))}
              {!data?.content.length && (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-gray-500">
                    등록된 유지보수 작업이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >이전</button>
              <span className="px-3 py-1">{page + 1} / {data.totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.totalPages - 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >다음</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: MaintenanceCreatePage 작성**

`frontend/src/pages/maintenance/MaintenanceCreatePage.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { maintenanceApi } from '../../api/maintenance'
import { equipmentApi } from '../../api/equipment'
import { faultApi } from '../../api/fault'
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  type MaintenanceType,
  type MaintenancePriority,
} from '../../types/maintenance'

export default function MaintenanceCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const faultId = searchParams.get('faultId') ? Number(searchParams.get('faultId')) : undefined

  const [form, setForm] = useState({
    equipmentId: '',
    title: '',
    description: '',
    taskType: 'REPAIR' as MaintenanceType,
    priority: 'MEDIUM' as MaintenancePriority,
    scheduledDate: '',
  })
  const [error, setError] = useState<string | null>(null)

  const { data: equipmentPage } = useQuery({
    queryKey: ['equipments', 'all'],
    queryFn: () => equipmentApi.search({ size: 100 }),
  })

  const { data: fault } = useQuery({
    queryKey: ['fault', faultId],
    queryFn: () => faultApi.getById(faultId!),
    enabled: !!faultId,
  })

  useEffect(() => {
    if (fault) {
      setForm(f => ({ ...f, equipmentId: String(fault.equipmentId), taskType: 'REPAIR' }))
    }
  }, [fault])

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      maintenanceApi.create({
        equipmentId: Number(form.equipmentId),
        faultId,
        title: form.title,
        description: form.description || undefined,
        taskType: form.taskType,
        priority: form.priority,
        scheduledDate: form.scheduledDate || undefined,
      }),
    onSuccess: res => navigate(`/maintenance/${res.id}`),
    onError: () => setError('작업 등록에 실패했습니다.'),
  })

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">유지보수 작업 등록</h1>
      {faultId && fault && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          장애 연동: <strong>{fault.title}</strong> ({fault.equipmentName})
        </div>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form
        onSubmit={e => { e.preventDefault(); mutate() }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">설비 *</label>
          <select
            required
            value={form.equipmentId}
            onChange={e => setForm(f => ({ ...f, equipmentId: e.target.value }))}
            disabled={!!faultId}
            className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">설비 선택</option>
            {equipmentPage?.content.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name} ({eq.equipmentNo})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">제목 *</label>
          <input
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="작업 제목"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">작업 유형 *</label>
          <select
            value={form.taskType}
            onChange={e => setForm(f => ({ ...f, taskType: e.target.value as MaintenanceType }))}
            className="w-full border rounded px-3 py-2"
          >
            {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map(t => (
              <option key={t} value={t}>{MAINTENANCE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">우선순위</label>
          <select
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value as MaintenancePriority }))}
            className="w-full border rounded px-3 py-2"
          >
            {(Object.keys(MAINTENANCE_PRIORITY_LABELS) as MaintenancePriority[]).map(p => (
              <option key={p} value={p}>{MAINTENANCE_PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="작업 내용 설명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">예정일</label>
          <input
            type="date"
            value={form.scheduledDate}
            onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          />
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
            onClick={() => navigate(faultId ? `/faults/${faultId}` : '/maintenance')}
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
git add frontend/src/pages/maintenance/
git commit -m "feat(maintenance): MaintenanceListPage + MaintenanceCreatePage"
```

---

### Task 5: MaintenanceDetailPage + 라우터 등록 + FaultDetailPage 수정

**Files:**
- Create: `frontend/src/pages/maintenance/MaintenanceDetailPage.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/pages/fault/FaultDetailPage.tsx`

**Interfaces:**
- Consumes: `maintenanceApi.getById`, `maintenanceApi.start`, `maintenanceApi.complete`, `maintenanceApi.cancel`, `maintenanceApi.delete`, 타입 상수 all from `../../types/maintenance`
- Produces: `/maintenance/:id` 상세 페이지 (시작/완료/취소 인라인 모달 + 이력 타임라인), 라우터에 3개 경로 추가, FaultDetailPage에 "정비작업 생성" 버튼

- [ ] **Step 1: MaintenanceDetailPage 작성**

`frontend/src/pages/maintenance/MaintenanceDetailPage.tsx`:
```tsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '../../api/maintenance'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
} from '../../types/maintenance'

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showStartModal, setShowStartModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [startContent, setStartContent] = useState('')
  const [completeContent, setCompleteContent] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceApi.getById(Number(id)),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['maintenance', id] })

  const startMutation = useMutation({
    mutationFn: () => maintenanceApi.start(Number(id), { content: startContent }),
    onSuccess: () => { setShowStartModal(false); setStartContent(''); invalidate() },
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      maintenanceApi.complete(Number(id), {
        content: completeContent,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      }),
    onSuccess: () => { setShowCompleteModal(false); setCompleteContent(''); setDurationMinutes(''); invalidate() },
  })

  const cancelMutation = useMutation({
    mutationFn: () => maintenanceApi.cancel(Number(id)),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => maintenanceApi.delete(Number(id)),
    onSuccess: () => navigate('/maintenance'),
  })

  if (isLoading) return <p className="p-6">로딩 중...</p>
  if (!task) return <p className="p-6">작업을 찾을 수 없습니다.</p>

  const isPending = task.status === 'PENDING'
  const isInProgress = task.status === 'IN_PROGRESS'
  const isDone = task.status === 'COMPLETED' || task.status === 'CANCELLED'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-sm text-gray-500 font-mono mb-1">{task.taskNo}</p>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{task.equipmentName}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isPending && (
            <button
              onClick={() => setShowStartModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >작업 시작</button>
          )}
          {isInProgress && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >작업 완료</button>
          )}
          {!isDone && (
            <button
              onClick={() => { if (confirm('취소하시겠습니까?')) cancelMutation.mutate() }}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >취소</button>
          )}
          {isPending && (
            <button
              onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate() }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >삭제</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
        <div>
          <span className="text-sm text-gray-500">상태</span>
          <p>
            <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_STATUS_COLORS[task.status]}`}>
              {MAINTENANCE_STATUS_LABELS[task.status]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">우선순위</span>
          <p>
            <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_PRIORITY_COLORS[task.priority]}`}>
              {MAINTENANCE_PRIORITY_LABELS[task.priority]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">작업 유형</span>
          <p className="font-medium">{MAINTENANCE_TYPE_LABELS[task.taskType]}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">담당자</span>
          <p className="font-medium">{task.assigneeName ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">예정일</span>
          <p>{task.scheduledDate ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">등록자</span>
          <p>{task.createdByName}</p>
        </div>
        {task.faultId && (
          <div className="col-span-2">
            <span className="text-sm text-gray-500">연관 장애</span>
            <p>
              <Link to={`/faults/${task.faultId}`} className="text-blue-600 hover:underline">
                장애 #{task.faultId} 보기
              </Link>
            </p>
          </div>
        )}
        {task.completedAt && (
          <div>
            <span className="text-sm text-gray-500">완료일시</span>
            <p>{new Date(task.completedAt).toLocaleString('ko-KR')}</p>
          </div>
        )}
      </div>

      {task.description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">설명</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">작업 이력</h2>
        {task.histories.length === 0 ? (
          <p className="text-gray-500">이력이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {task.histories.map(h => (
              <li
                key={h.id}
                className={`border-l-4 pl-4 py-2 ${h.type === 'START' ? 'border-blue-400' : 'border-green-400'}`}
              >
                <div className="flex items-center gap-2 text-sm mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.type === 'START' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {h.type === 'START' ? '시작' : '완료'}
                  </span>
                  <span className="text-gray-500">by {h.recordedByName}</span>
                  {h.durationMinutes && (
                    <span className="text-gray-500">· {h.durationMinutes}분 소요</span>
                  )}
                  <span className="text-gray-400 ml-auto">
                    {new Date(h.recordedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{h.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">작업 시작</h2>
            <textarea
              value={startContent}
              onChange={e => setStartContent(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              rows={4}
              placeholder="작업 시작 내용을 입력하세요 *"
            />
            <div className="flex gap-3">
              <button
                onClick={() => startMutation.mutate()}
                disabled={!startContent.trim() || startMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >시작</button>
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 border py-2 rounded hover:bg-gray-50"
              >취소</button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">작업 완료</h2>
            <textarea
              value={completeContent}
              onChange={e => setCompleteContent(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
              rows={4}
              placeholder="작업 결과 및 소견을 입력하세요 *"
            />
            <input
              type="number"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="소요 시간 (분, 선택)"
              min={1}
            />
            <div className="flex gap-3">
              <button
                onClick={() => completeMutation.mutate()}
                disabled={!completeContent.trim() || completeMutation.isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >완료</button>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 border py-2 rounded hover:bg-gray-50"
              >취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 라우터에 유지보수 페이지 등록**

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
import MaintenanceListPage from '../pages/maintenance/MaintenanceListPage'
import MaintenanceCreatePage from '../pages/maintenance/MaintenanceCreatePage'
import MaintenanceDetailPage from '../pages/maintenance/MaintenanceDetailPage'

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
  { path: '/maintenance', element: <MaintenanceListPage /> },
  { path: '/maintenance/new', element: <MaintenanceCreatePage /> },
  { path: '/maintenance/:id', element: <MaintenanceDetailPage /> },
  { path: '*', element: <NotFoundPage /> },
])

export default router
```

- [ ] **Step 3: FaultDetailPage에 "정비작업 생성" 버튼 추가**

`frontend/src/pages/fault/FaultDetailPage.tsx` — 버튼 div에 버튼 1개 추가:

```diff
        <div className="flex gap-2">
+         <button
+           onClick={() => navigate(`/maintenance/new?faultId=${fault.id}`)}
+           className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
+         >
+           정비작업 생성
+         </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            상태변경
          </button>
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
git commit -m "feat(maintenance): MaintenanceDetailPage + 라우터 등록 + FaultDetailPage 연동"
```

---

## Self-Review

**스펙 커버리지:**
| 요구사항 | Task |
|---|---|
| MaintenanceTask 엔티티 (taskNo 자동생성 포함) | Task 1, Task 2 (generateTaskNo) |
| MaintenanceHistory 엔티티 | Task 1 |
| 상태머신 PENDING→IN_PROGRESS→COMPLETED / CANCELLED | Task 1 (Entity 메서드) |
| QueryDSL 검색 (equipmentId/status/priority/assigneeId/faultId/from/to) | Task 1 |
| CRUD API | Task 2 |
| start/complete/cancel API + 이력 기록 | Task 2 |
| 담당자 배정 API | Task 2 |
| 통합 테스트 (8 cases, TDD) | Task 2 |
| Frontend 타입 + API 클라이언트 | Task 3 |
| MaintenanceListPage (필터/페이지네이션) | Task 4 |
| MaintenanceCreatePage (faultId 연동) | Task 4 |
| MaintenanceDetailPage (시작/완료/취소 모달 + 이력 타임라인) | Task 5 |
| 라우터 3개 경로 등록 | Task 5 |
| FaultDetailPage "정비작업 생성" 버튼 | Task 5 |

**타입 일관성:**
- `maintenanceApi.start/complete/cancel` → Task 3 정의, Task 5에서 호출 ✓
- `MaintenanceStartRequest.content`, `MaintenanceCompleteRequest.content/durationMinutes` → Task 2 정의, Task 5 일치 ✓
- `MAINTENANCE_STATUS/PRIORITY/TYPE_LABELS/COLORS` → Task 3 정의, Task 4·5에서 import ✓
- `task.histories` (MaintenanceHistory[]) → Task 3 interface 정의, Task 5에서 `.map(h => ...)` ✓
