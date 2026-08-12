# 점검관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WBS 5.0~5.3 — 체크리스트 템플릿 / 점검 일정 / 점검 수행 백엔드 API + 프론트엔드 4페이지 구현

**Architecture:** Equipment 도메인 패턴 그대로 — Entity→Service→Controller, QueryDSL for 일정 검색, React+TanStack Query for frontend. 브랜치: `feat/inspection`

**Tech Stack:** Spring Boot 4.1, Spring Security+JWT, QueryDSL, React+TypeScript+Vite, TanStack Query v5, Tailwind CSS

## Global Constraints
- 패키지 루트: `com.factorycare.backend`
- 테스트: `@ActiveProfiles("test")`, H2 in-memory, `tools.jackson.databind.ObjectMapper`, `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`
- Entity: `@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)` + `@Builder` 생성자
- DTO: Java record + `static from(Entity)` 팩토리
- Controller: 생성자 주입, `@PreAuthorize` 역할 제어
- Frontend API: `axiosInstance` 사용, baseURL `/api` (기존 패턴)

---

### Task 1: 브랜치 생성 + 체크리스트 엔티티 + 리포지토리

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/entity/InspectionChecklist.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/entity/InspectionChecklistItem.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/repository/InspectionChecklistRepository.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/repository/InspectionChecklistItemRepository.java`

**Interfaces:**
- Produces: `InspectionChecklist` (id, name, description, equipmentType nullable FK, items List, active, createdAt), `InspectionChecklistItem` (id, checklist FK, itemName, itemOrder)

- [ ] **Step 1: 브랜치 생성**
```bash
git checkout -b feat/inspection
```

- [ ] **Step 2: InspectionChecklist 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/inspection/entity/InspectionChecklist.java`:
```java
package com.factorycare.backend.domain.inspection.entity;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inspection_checklists")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class InspectionChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_type_id")
    private EquipmentType equipmentType;

    @OneToMany(mappedBy = "checklist", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("itemOrder ASC")
    private List<InspectionChecklistItem> items = new ArrayList<>();

    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public InspectionChecklist(String name, String description, EquipmentType equipmentType) {
        this.name = name;
        this.description = description;
        this.equipmentType = equipmentType;
    }

    public void update(String name, String description, EquipmentType equipmentType) {
        if (name != null) this.name = name;
        if (description != null) this.description = description;
        this.equipmentType = equipmentType;
    }

    public void replaceItems(List<InspectionChecklistItem> newItems) {
        this.items.clear();
        this.items.addAll(newItems);
    }

    public void deactivate() { this.active = false; }
}
```

- [ ] **Step 3: InspectionChecklistItem 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/inspection/entity/InspectionChecklistItem.java`:
```java
package com.factorycare.backend.domain.inspection.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inspection_checklist_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InspectionChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    private InspectionChecklist checklist;

    @Column(nullable = false, length = 100)
    private String itemName;

    @Column(nullable = false)
    private int itemOrder;

    @Builder
    public InspectionChecklistItem(InspectionChecklist checklist, String itemName, int itemOrder) {
        this.checklist = checklist;
        this.itemName = itemName;
        this.itemOrder = itemOrder;
    }
}
```

- [ ] **Step 4: 리포지토리 작성**

`InspectionChecklistRepository.java`:
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InspectionChecklistRepository extends JpaRepository<InspectionChecklist, Long> {
    List<InspectionChecklist> findAllByActiveTrueOrderByCreatedAtDesc();
    Optional<InspectionChecklist> findByIdAndActiveTrue(Long id);
}
```

`InspectionChecklistItemRepository.java`:
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionChecklistItemRepository extends JpaRepository<InspectionChecklistItem, Long> {}
```

- [ ] **Step 5: 컴파일 확인**
```bash
cd backend && ./gradlew compileJava
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: 커밋**
```bash
git add backend/src/main/java/com/factorycare/backend/domain/inspection/
git commit -m "feat(inspection): 체크리스트 엔티티 + 리포지토리"
```

---

### Task 2: 체크리스트 DTO + Service + Controller + 통합 테스트

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/dto/InspectionChecklistCreateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/dto/InspectionChecklistUpdateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/dto/InspectionChecklistResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/dto/InspectionChecklistItemResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/service/InspectionChecklistService.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/inspection/controller/InspectionChecklistController.java`
- Create: `backend/src/test/java/com/factorycare/backend/domain/inspection/InspectionChecklistControllerTest.java`

**Interfaces:**
- Consumes: `InspectionChecklistRepository`, `InspectionChecklistItemRepository`, `EquipmentTypeRepository`
- Produces: REST API `GET|POST /api/inspection-checklists`, `GET|PATCH|DELETE /api/inspection-checklists/{id}`

- [ ] **Step 1: 실패 테스트 작성**

`backend/src/test/java/com/factorycare/backend/domain/inspection/InspectionChecklistControllerTest.java`:
```java
package com.factorycare.backend.domain.inspection;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import com.factorycare.backend.domain.inspection.repository.InspectionChecklistRepository;
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

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InspectionChecklistControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired InspectionChecklistRepository checklistRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;

    @BeforeEach
    void setUp() {
        checklistRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
            .loginId("admin01").password(passwordEncoder.encode("pw"))
            .name("관리자").role(UserRole.ADMIN).build());
        User manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        User worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        adminToken = "Bearer " + jwtProvider.generateAccessToken(admin.getId(), UserRole.ADMIN);
        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);
    }

    @Test
    @DisplayName("MANAGER가 체크리스트 생성 → 201")
    void create_asManager() throws Exception {
        var body = Map.of(
            "name", "컨베이어 일일 점검",
            "itemNames", List.of("모터 온도", "벨트 장력", "오일 누유")
        );
        mockMvc.perform(post("/api/inspection-checklists")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("컨베이어 일일 점검"))
            .andExpect(jsonPath("$.items.length()").value(3));
    }

    @Test
    @DisplayName("WORKER가 체크리스트 생성 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of("name", "테스트", "itemNames", List.of("항목1"));
        mockMvc.perform(post("/api/inspection-checklists")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("체크리스트 목록 조회")
    void getAll() throws Exception {
        checklistRepository.save(InspectionChecklist.builder().name("목록A").build());
        checklistRepository.save(InspectionChecklist.builder().name("목록B").build());

        mockMvc.perform(get("/api/inspection-checklists")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("체크리스트 상세 조회 - 항목 포함")
    void getById() throws Exception {
        var body = Map.of("name", "상세조회 테스트", "itemNames", List.of("항목A", "항목B"));
        var result = mockMvc.perform(post("/api/inspection-checklists")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andReturn();
        var id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/inspection-checklists/" + id)
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2));
    }

    @Test
    @DisplayName("ADMIN이 체크리스트 삭제 → 204")
    void delete_asAdmin() throws Exception {
        InspectionChecklist cl = checklistRepository.save(
            InspectionChecklist.builder().name("삭제대상").build());

        mockMvc.perform(delete("/api/inspection-checklists/" + cl.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**
```bash
cd backend && ./gradlew test --tests "*.InspectionChecklistControllerTest" 2>&1 | tail -20
```
Expected: FAILED (컨트롤러/서비스 없음)

- [ ] **Step 3: DTO 작성**

`InspectionChecklistItemResponse.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklistItem;

public record InspectionChecklistItemResponse(Long id, String itemName, int itemOrder) {
    public static InspectionChecklistItemResponse from(InspectionChecklistItem item) {
        return new InspectionChecklistItemResponse(item.getId(), item.getItemName(), item.getItemOrder());
    }
}
```

`InspectionChecklistResponse.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import java.time.LocalDateTime;
import java.util.List;

public record InspectionChecklistResponse(
    Long id, String name, String description,
    String equipmentTypeName,
    List<InspectionChecklistItemResponse> items,
    LocalDateTime createdAt
) {
    public static InspectionChecklistResponse from(InspectionChecklist cl) {
        return new InspectionChecklistResponse(
            cl.getId(), cl.getName(), cl.getDescription(),
            cl.getEquipmentType() != null ? cl.getEquipmentType().getName() : null,
            cl.getItems().stream().map(InspectionChecklistItemResponse::from).toList(),
            cl.getCreatedAt()
        );
    }
}
```

`InspectionChecklistCreateRequest.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record InspectionChecklistCreateRequest(
    @NotBlank(message = "체크리스트명은 필수입니다.") String name,
    String description,
    Long equipmentTypeId,
    @NotEmpty(message = "점검 항목은 1개 이상 필요합니다.") List<String> itemNames
) {}
```

`InspectionChecklistUpdateRequest.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import java.util.List;

public record InspectionChecklistUpdateRequest(
    String name, String description,
    Long equipmentTypeId,
    List<String> itemNames
) {}
```

- [ ] **Step 4: Service 작성**

`backend/src/main/java/com/factorycare/backend/domain/inspection/service/InspectionChecklistService.java`:
```java
package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.InspectionChecklist;
import com.factorycare.backend.domain.inspection.entity.InspectionChecklistItem;
import com.factorycare.backend.domain.inspection.repository.InspectionChecklistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class InspectionChecklistService {

    private final InspectionChecklistRepository checklistRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;

    public InspectionChecklistService(InspectionChecklistRepository checklistRepository,
                                      EquipmentTypeRepository equipmentTypeRepository) {
        this.checklistRepository = checklistRepository;
        this.equipmentTypeRepository = equipmentTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<InspectionChecklistResponse> findAll() {
        return checklistRepository.findAllByActiveTrueOrderByCreatedAtDesc()
            .stream().map(InspectionChecklistResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public InspectionChecklistResponse findById(Long id) {
        return InspectionChecklistResponse.from(getChecklist(id));
    }

    @Transactional
    public InspectionChecklistResponse create(InspectionChecklistCreateRequest req) {
        EquipmentType type = req.equipmentTypeId() != null
            ? equipmentTypeRepository.findById(req.equipmentTypeId())
                .orElseThrow(() -> new IllegalArgumentException("설비유형을 찾을 수 없습니다."))
            : null;

        InspectionChecklist checklist = InspectionChecklist.builder()
            .name(req.name()).description(req.description()).equipmentType(type).build();

        addItems(checklist, req.itemNames());
        return InspectionChecklistResponse.from(checklistRepository.save(checklist));
    }

    @Transactional
    public InspectionChecklistResponse update(Long id, InspectionChecklistUpdateRequest req) {
        InspectionChecklist checklist = getChecklist(id);
        EquipmentType type = req.equipmentTypeId() != null
            ? equipmentTypeRepository.findById(req.equipmentTypeId())
                .orElseThrow(() -> new IllegalArgumentException("설비유형을 찾을 수 없습니다."))
            : null;

        checklist.update(req.name(), req.description(), type);
        if (req.itemNames() != null && !req.itemNames().isEmpty()) {
            checklist.replaceItems(buildItems(checklist, req.itemNames()));
        }
        return InspectionChecklistResponse.from(checklist);
    }

    @Transactional
    public void deactivate(Long id) {
        getChecklist(id).deactivate();
    }

    InspectionChecklist getChecklist(Long id) {
        return checklistRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("체크리스트를 찾을 수 없습니다. id=" + id));
    }

    private void addItems(InspectionChecklist checklist, List<String> itemNames) {
        checklist.replaceItems(buildItems(checklist, itemNames));
    }

    private List<InspectionChecklistItem> buildItems(InspectionChecklist checklist, List<String> itemNames) {
        AtomicInteger order = new AtomicInteger(1);
        return itemNames.stream()
            .map(name -> InspectionChecklistItem.builder()
                .checklist(checklist).itemName(name).itemOrder(order.getAndIncrement()).build())
            .toList();
    }
}
```

- [ ] **Step 5: Controller 작성**

`backend/src/main/java/com/factorycare/backend/domain/inspection/controller/InspectionChecklistController.java`:
```java
package com.factorycare.backend.domain.inspection.controller;

import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.service.InspectionChecklistService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/inspection-checklists")
public class InspectionChecklistController {

    private final InspectionChecklistService service;

    public InspectionChecklistController(InspectionChecklistService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<InspectionChecklistResponse>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionChecklistResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionChecklistResponse> create(
            @Valid @RequestBody InspectionChecklistCreateRequest req) {
        InspectionChecklistResponse res = service.create(req);
        return ResponseEntity.created(URI.create("/api/inspection-checklists/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionChecklistResponse> update(
            @PathVariable Long id,
            @RequestBody InspectionChecklistUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**
```bash
cd backend && ./gradlew test --tests "*.InspectionChecklistControllerTest"
```
Expected: BUILD SUCCESSFUL, 5 tests passed

- [ ] **Step 7: 커밋**
```bash
git add backend/src/
git commit -m "feat(inspection): 체크리스트 템플릿 API (CRUD)"
```

---

### Task 3: 점검 일정 엔티티 + QueryDSL 리포지토리

**Files:**
- Create: `domain/inspection/entity/InspectionScheduleStatus.java`
- Create: `domain/inspection/entity/InspectionScheduleType.java`
- Create: `domain/inspection/entity/InspectionSchedule.java`
- Create: `domain/inspection/repository/InspectionScheduleRepository.java`
- Create: `domain/inspection/repository/InspectionScheduleRepositoryCustom.java`
- Create: `domain/inspection/repository/InspectionScheduleRepositoryImpl.java`
- Create: `domain/inspection/dto/InspectionScheduleSearchCondition.java`

**Interfaces:**
- Produces: `InspectionSchedule` (id, equipment, checklist, assignee, scheduledDate, type, status, description, createdAt)

- [ ] **Step 1: Enum 작성**

`InspectionScheduleStatus.java`:
```java
package com.factorycare.backend.domain.inspection.entity;

public enum InspectionScheduleStatus { SCHEDULED, IN_PROGRESS, COMPLETED, OVERDUE }
```

`InspectionScheduleType.java`:
```java
package com.factorycare.backend.domain.inspection.entity;

public enum InspectionScheduleType { DAILY, WEEKLY, MONTHLY, CUSTOM }
```

- [ ] **Step 2: InspectionSchedule 엔티티 작성**

`InspectionSchedule.java`:
```java
package com.factorycare.backend.domain.inspection.entity;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "inspection_schedules")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class InspectionSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    private InspectionChecklist checklist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id", nullable = false)
    private User assignee;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionScheduleType inspectionType = InspectionScheduleType.CUSTOM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionScheduleStatus status = InspectionScheduleStatus.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public InspectionSchedule(Equipment equipment, InspectionChecklist checklist,
                               User assignee, LocalDate scheduledDate,
                               InspectionScheduleType inspectionType, String description) {
        this.equipment = equipment;
        this.checklist = checklist;
        this.assignee = assignee;
        this.scheduledDate = scheduledDate;
        this.inspectionType = inspectionType != null ? inspectionType : InspectionScheduleType.CUSTOM;
        this.description = description;
    }

    public void update(User assignee, LocalDate scheduledDate,
                       InspectionScheduleType inspectionType, String description) {
        if (assignee != null) this.assignee = assignee;
        if (scheduledDate != null) this.scheduledDate = scheduledDate;
        if (inspectionType != null) this.inspectionType = inspectionType;
        if (description != null) this.description = description;
    }

    public void startInspection() {
        if (this.status != InspectionScheduleStatus.SCHEDULED) {
            throw new IllegalStateException("SCHEDULED 상태에서만 점검을 시작할 수 있습니다.");
        }
        this.status = InspectionScheduleStatus.IN_PROGRESS;
    }

    public void complete() { this.status = InspectionScheduleStatus.COMPLETED; }
}
```

- [ ] **Step 3: QueryDSL 리포지토리 작성**

`InspectionScheduleRepositoryCustom.java`:
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.dto.InspectionScheduleSearchCondition;
import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InspectionScheduleRepositoryCustom {
    Page<InspectionSchedule> search(InspectionScheduleSearchCondition cond, Pageable pageable);
}
```

`InspectionScheduleSearchCondition.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import java.time.LocalDate;

public record InspectionScheduleSearchCondition(
    Long equipmentId, Long assigneeId,
    InspectionScheduleStatus status,
    LocalDate from, LocalDate to
) {}
```

`InspectionScheduleRepositoryImpl.java`:
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.dto.InspectionScheduleSearchCondition;
import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.entity.QInspectionSchedule;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

public class InspectionScheduleRepositoryImpl implements InspectionScheduleRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public InspectionScheduleRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<InspectionSchedule> search(InspectionScheduleSearchCondition cond, Pageable pageable) {
        QInspectionSchedule qs = QInspectionSchedule.inspectionSchedule;

        List<InspectionSchedule> content = queryFactory
            .selectFrom(qs)
            .where(
                equipmentEq(qs, cond.equipmentId()),
                assigneeEq(qs, cond.assigneeId()),
                statusEq(qs, cond.status()),
                dateFrom(qs, cond.from()),
                dateTo(qs, cond.to())
            )
            .orderBy(qs.scheduledDate.asc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory.select(qs.count()).from(qs)
            .where(
                equipmentEq(qs, cond.equipmentId()),
                assigneeEq(qs, cond.assigneeId()),
                statusEq(qs, cond.status()),
                dateFrom(qs, cond.from()),
                dateTo(qs, cond.to())
            ).fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression equipmentEq(QInspectionSchedule qs, Long equipmentId) {
        return equipmentId != null ? qs.equipment.id.eq(equipmentId) : null;
    }
    private BooleanExpression assigneeEq(QInspectionSchedule qs, Long assigneeId) {
        return assigneeId != null ? qs.assignee.id.eq(assigneeId) : null;
    }
    private BooleanExpression statusEq(QInspectionSchedule qs, InspectionScheduleStatus status) {
        return status != null ? qs.status.eq(status) : null;
    }
    private BooleanExpression dateFrom(QInspectionSchedule qs, LocalDate from) {
        return from != null ? qs.scheduledDate.goe(from) : null;
    }
    private BooleanExpression dateTo(QInspectionSchedule qs, LocalDate to) {
        return to != null ? qs.scheduledDate.loe(to) : null;
    }
}
```

`InspectionScheduleRepository.java`:
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionScheduleRepository
    extends JpaRepository<InspectionSchedule, Long>, InspectionScheduleRepositoryCustom {}
```

- [ ] **Step 4: 컴파일 + Q클래스 생성**
```bash
cd backend && ./gradlew compileJava
```
Expected: BUILD SUCCESSFUL (QInspectionSchedule 자동 생성됨)

- [ ] **Step 5: 커밋**
```bash
git add backend/src/
git commit -m "feat(inspection): 점검 일정 엔티티 + QueryDSL 리포지토리"
```

---

### Task 4: 점검 일정 DTO + Service + Controller + 테스트

**Files:**
- Create: `dto/InspectionScheduleCreateRequest.java`
- Create: `dto/InspectionScheduleUpdateRequest.java`
- Create: `dto/InspectionScheduleResponse.java`
- Create: `service/InspectionScheduleService.java`
- Create: `controller/InspectionScheduleController.java`
- Create: `test/.../InspectionScheduleControllerTest.java`

**Interfaces:**
- Produces: `POST /api/inspection-schedules/{id}/start` → InspectionResponse (201)

- [ ] **Step 1: 실패 테스트 작성**

`InspectionScheduleControllerTest.java`:
```java
package com.factorycare.backend.domain.inspection;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
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
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InspectionScheduleControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired InspectionChecklistRepository checklistRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String managerToken, workerToken;
    User worker;
    Equipment equipment;
    InspectionChecklist checklist;

    @BeforeEach
    void setUp() {
        inspectionRepository.deleteAll();
        scheduleRepository.deleteAll();
        checklistRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        User manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        equipment = equipmentRepository.save(Equipment.builder()
            .equipmentNo("EQ-001").name("컨베이어").build());
        checklist = checklistRepository.save(
            InspectionChecklist.builder().name("일일 점검").build());
    }

    @Test
    @DisplayName("MANAGER가 일정 생성 → 201")
    void create_asManager() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "checklistId", checklist.getId(),
            "assigneeId", worker.getId(),
            "scheduledDate", LocalDate.now().plusDays(1).toString(),
            "inspectionType", "DAILY"
        );
        mockMvc.perform(post("/api/inspection-schedules")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("SCHEDULED"))
            .andExpect(jsonPath("$.equipmentName").value("컨베이어"));
    }

    @Test
    @DisplayName("WORKER가 일정 생성 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of(
            "equipmentId", equipment.getId(),
            "checklistId", checklist.getId(),
            "assigneeId", worker.getId(),
            "scheduledDate", LocalDate.now().toString(),
            "inspectionType", "DAILY"
        );
        mockMvc.perform(post("/api/inspection-schedules")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("일정 start → Inspection 생성 (201)")
    void start_createsInspection() throws Exception {
        InspectionSchedule schedule = scheduleRepository.save(
            InspectionSchedule.builder()
                .equipment(equipment).checklist(checklist)
                .assignee(worker).scheduledDate(LocalDate.now())
                .inspectionType(InspectionScheduleType.DAILY).build());

        mockMvc.perform(post("/api/inspection-schedules/" + schedule.getId() + "/start")
                .header("Authorization", managerToken))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @DisplayName("일정 목록 페이징 조회")
    void getList() throws Exception {
        scheduleRepository.save(InspectionSchedule.builder()
            .equipment(equipment).checklist(checklist).assignee(worker)
            .scheduledDate(LocalDate.now()).inspectionType(InspectionScheduleType.DAILY).build());

        mockMvc.perform(get("/api/inspection-schedules")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1));
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**
```bash
cd backend && ./gradlew test --tests "*.InspectionScheduleControllerTest" 2>&1 | tail -10
```
Expected: FAILED

- [ ] **Step 3: DTO 작성**

`InspectionScheduleCreateRequest.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionScheduleType;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record InspectionScheduleCreateRequest(
    @NotNull Long equipmentId,
    @NotNull Long checklistId,
    @NotNull Long assigneeId,
    @NotNull LocalDate scheduledDate,
    InspectionScheduleType inspectionType,
    String description
) {}
```

`InspectionScheduleUpdateRequest.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionScheduleType;
import java.time.LocalDate;

public record InspectionScheduleUpdateRequest(
    Long assigneeId, LocalDate scheduledDate,
    InspectionScheduleType inspectionType, String description
) {}
```

`InspectionScheduleResponse.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleType;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InspectionScheduleResponse(
    Long id,
    Long equipmentId, String equipmentName,
    Long checklistId, String checklistName,
    Long assigneeId, String assigneeName,
    LocalDate scheduledDate,
    InspectionScheduleType inspectionType,
    InspectionScheduleStatus status,
    String description,
    LocalDateTime createdAt
) {
    public static InspectionScheduleResponse from(InspectionSchedule s) {
        return new InspectionScheduleResponse(
            s.getId(),
            s.getEquipment().getId(), s.getEquipment().getName(),
            s.getChecklist().getId(), s.getChecklist().getName(),
            s.getAssignee().getId(), s.getAssignee().getName(),
            s.getScheduledDate(), s.getInspectionType(), s.getStatus(),
            s.getDescription(), s.getCreatedAt()
        );
    }
}
```

- [ ] **Step 4: Inspection 엔티티 스텁 작성** (Task 5에서 완성; Service 컴파일에 필요)

`entity/InspectionStatus.java`:
```java
package com.factorycare.backend.domain.inspection.entity;
public enum InspectionStatus { IN_PROGRESS, COMPLETED }
```

`entity/Inspection.java` (스텁):
```java
package com.factorycare.backend.domain.inspection.entity;

import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "inspections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Inspection {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false)
    private InspectionSchedule schedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspector_id", nullable = false)
    private User inspector;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionStatus status = InspectionStatus.IN_PROGRESS;

    @Column(nullable = false)
    private boolean hasAbnormality = false;

    private LocalDateTime completedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Inspection(InspectionSchedule schedule, User inspector) {
        this.schedule = schedule;
        this.inspector = inspector;
    }

    public void complete(boolean hasAbnormality) {
        this.status = InspectionStatus.COMPLETED;
        this.hasAbnormality = hasAbnormality;
        this.completedAt = LocalDateTime.now();
    }
}
```

`repository/InspectionRepository.java` (스텁):
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.Inspection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InspectionRepository extends JpaRepository<Inspection, Long> {
    List<Inspection> findByScheduleIdOrderByCreatedAtDesc(Long scheduleId);
}
```

`dto/InspectionResponse.java` (스텁):
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.Inspection;
import com.factorycare.backend.domain.inspection.entity.InspectionStatus;
import java.time.LocalDateTime;
import java.util.List;

public record InspectionResponse(
    Long id, Long scheduleId,
    Long inspectorId, String inspectorName,
    InspectionStatus status,
    boolean hasAbnormality,
    LocalDateTime completedAt,
    List<InspectionResultResponse> results,
    LocalDateTime createdAt
) {
    public static InspectionResponse from(Inspection i) {
        return new InspectionResponse(
            i.getId(), i.getSchedule().getId(),
            i.getInspector().getId(), i.getInspector().getName(),
            i.getStatus(), i.isHasAbnormality(),
            i.getCompletedAt(), List.of(), i.getCreatedAt()
        );
    }
}
```

`dto/InspectionResultResponse.java` (스텁):
```java
package com.factorycare.backend.domain.inspection.dto;

public record InspectionResultResponse(
    Long id, Long checklistItemId, String itemName,
    String result, String note, boolean needsFaultReport
) {}
```

- [ ] **Step 5: Service 작성**

`service/InspectionScheduleService.java`:
```java
package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InspectionScheduleService {

    private final InspectionScheduleRepository scheduleRepository;
    private final InspectionRepository inspectionRepository;
    private final InspectionChecklistService checklistService;
    private final EquipmentRepository equipmentRepository;
    private final UserRepository userRepository;

    public InspectionScheduleService(InspectionScheduleRepository scheduleRepository,
                                     InspectionRepository inspectionRepository,
                                     InspectionChecklistService checklistService,
                                     EquipmentRepository equipmentRepository,
                                     UserRepository userRepository) {
        this.scheduleRepository = scheduleRepository;
        this.inspectionRepository = inspectionRepository;
        this.checklistService = checklistService;
        this.equipmentRepository = equipmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<InspectionScheduleResponse> search(InspectionScheduleSearchCondition cond, Pageable pageable) {
        return scheduleRepository.search(cond, pageable).map(InspectionScheduleResponse::from);
    }

    @Transactional(readOnly = true)
    public InspectionScheduleResponse findById(Long id) {
        return InspectionScheduleResponse.from(getSchedule(id));
    }

    @Transactional
    public InspectionScheduleResponse create(InspectionScheduleCreateRequest req) {
        Equipment equipment = equipmentRepository.findByIdAndActiveTrue(req.equipmentId())
            .orElseThrow(() -> new IllegalArgumentException("설비를 찾을 수 없습니다."));
        InspectionChecklist checklist = checklistService.getChecklist(req.checklistId());
        User assignee = getUser(req.assigneeId());

        InspectionSchedule schedule = InspectionSchedule.builder()
            .equipment(equipment).checklist(checklist).assignee(assignee)
            .scheduledDate(req.scheduledDate())
            .inspectionType(req.inspectionType())
            .description(req.description())
            .build();

        return InspectionScheduleResponse.from(scheduleRepository.save(schedule));
    }

    @Transactional
    public InspectionScheduleResponse update(Long id, InspectionScheduleUpdateRequest req) {
        InspectionSchedule schedule = getSchedule(id);
        User assignee = req.assigneeId() != null ? getUser(req.assigneeId()) : null;
        schedule.update(assignee, req.scheduledDate(), req.inspectionType(), req.description());
        return InspectionScheduleResponse.from(schedule);
    }

    @Transactional
    public InspectionResponse startInspection(Long scheduleId, Long inspectorId) {
        InspectionSchedule schedule = getSchedule(scheduleId);
        User inspector = getUser(inspectorId);
        schedule.startInspection();

        Inspection inspection = Inspection.builder()
            .schedule(schedule).inspector(inspector).build();
        return InspectionResponse.from(inspectionRepository.save(inspection));
    }

    @Transactional
    public void delete(Long id) {
        scheduleRepository.delete(getSchedule(id));
    }

    InspectionSchedule getSchedule(Long id) {
        return scheduleRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("점검 일정을 찾을 수 없습니다. id=" + id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + id));
    }
}
```

- [ ] **Step 6: Controller 작성**

`controller/InspectionScheduleController.java`:
```java
package com.factorycare.backend.domain.inspection.controller;

import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.service.InspectionScheduleService;
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
@RequestMapping("/api/inspection-schedules")
public class InspectionScheduleController {

    private final InspectionScheduleService service;

    public InspectionScheduleController(InspectionScheduleService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<Page<InspectionScheduleResponse>> search(
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) InspectionScheduleStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 10, sort = "scheduledDate", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(service.search(
            new InspectionScheduleSearchCondition(equipmentId, assigneeId, status, from, to), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionScheduleResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionScheduleResponse> create(
            @Valid @RequestBody InspectionScheduleCreateRequest req) {
        InspectionScheduleResponse res = service.create(req);
        return ResponseEntity.created(URI.create("/api/inspection-schedules/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionScheduleResponse> update(
            @PathVariable Long id, @RequestBody InspectionScheduleUpdateRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<InspectionResponse> start(
            @PathVariable Long id,
            @AuthenticationPrincipal Long userId) {
        InspectionResponse res = service.startInspection(id, userId);
        return ResponseEntity.created(URI.create("/api/inspections/" + res.id())).body(res);
    }
}
```

- [ ] **Step 7: 테스트 실행 → 통과 확인**
```bash
cd backend && ./gradlew test --tests "*.InspectionScheduleControllerTest"
```
Expected: BUILD SUCCESSFUL, 4 tests passed

- [ ] **Step 8: 커밋**
```bash
git add backend/src/
git commit -m "feat(inspection): 점검 일정 API (CRUD + start)"
```

---

### Task 5: 점검 수행 엔티티 완성 + Service + Controller + 테스트

**Files:**
- Create: `entity/InspectionResultValue.java`
- Create: `entity/InspectionResult.java`
- Create: `repository/InspectionResultRepository.java`
- Modify: `dto/InspectionResponse.java` (결과 포함하도록)
- Create: `dto/InspectionCompleteRequest.java`
- Create: `dto/InspectionResultRequest.java`
- Create: `service/InspectionService.java`
- Create: `controller/InspectionController.java`
- Create: `test/.../InspectionControllerTest.java`

**Interfaces:**
- Consumes: `Inspection` (Task 4 스텁), `InspectionChecklist` + items
- Produces: `POST /api/inspections/{id}/complete` → InspectionResponse (FAIL 항목 시 hasAbnormality=true)

- [ ] **Step 1: 실패 테스트 작성**

`InspectionControllerTest.java`:
```java
package com.factorycare.backend.domain.inspection;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InspectionControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired InspectionChecklistRepository checklistRepository;
    @Autowired InspectionChecklistItemRepository checklistItemRepository;
    @Autowired InspectionScheduleRepository scheduleRepository;
    @Autowired InspectionRepository inspectionRepository;
    @Autowired InspectionResultRepository resultRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String workerToken;
    User worker;
    InspectionChecklistItem item1, item2;
    Inspection inspection;

    @BeforeEach
    void setUp() {
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

        item1 = checklistItemRepository.save(
            InspectionChecklistItem.builder().checklist(checklist).itemName("모터 온도").itemOrder(1).build());
        item2 = checklistItemRepository.save(
            InspectionChecklistItem.builder().checklist(checklist).itemName("오일 누유").itemOrder(2).build());

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
    @DisplayName("점검 상세 조회")
    void getById() throws Exception {
        mockMvc.perform(get("/api/inspections/" + inspection.getId())
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
            .andExpect(jsonPath("$.inspectorName").value("작업자"));
    }

    @Test
    @DisplayName("점검 완료 - PASS만 → hasAbnormality false")
    void complete_allPass() throws Exception {
        var body = Map.of("results", List.of(
            Map.of("checklistItemId", item1.getId(), "result", "PASS"),
            Map.of("checklistItemId", item2.getId(), "result", "PASS")
        ));
        mockMvc.perform(post("/api/inspections/" + inspection.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.hasAbnormality").value(false))
            .andExpect(jsonPath("$.results.length()").value(2));
    }

    @Test
    @DisplayName("점검 완료 - FAIL 포함 → hasAbnormality true + needsFaultReport true")
    void complete_withFail_setsAbnormality() throws Exception {
        var body = Map.of("results", List.of(
            Map.of("checklistItemId", item1.getId(), "result", "PASS"),
            Map.of("checklistItemId", item2.getId(), "result", "FAIL", "note", "오일 누유 발견")
        ));
        mockMvc.perform(post("/api/inspections/" + inspection.getId() + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.hasAbnormality").value(true))
            .andExpect(jsonPath("$.results[?(@.itemName=='오일 누유')].needsFaultReport").value(true));
    }

    @Test
    @DisplayName("점검 목록 조회")
    void getAll() throws Exception {
        mockMvc.perform(get("/api/inspections")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**
```bash
cd backend && ./gradlew test --tests "*.InspectionControllerTest" 2>&1 | tail -10
```

- [ ] **Step 3: InspectionResult 엔티티 작성**

`entity/InspectionResultValue.java`:
```java
package com.factorycare.backend.domain.inspection.entity;
public enum InspectionResultValue { PASS, FAIL, SKIPPED }
```

`entity/InspectionResult.java`:
```java
package com.factorycare.backend.domain.inspection.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inspection_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InspectionResult {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    private Inspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_item_id", nullable = false)
    private InspectionChecklistItem checklistItem;

    @Column(nullable = false, length = 100)
    private String itemName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InspectionResultValue result;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false)
    private boolean needsFaultReport = false;

    @Builder
    public InspectionResult(Inspection inspection, InspectionChecklistItem checklistItem,
                             String itemName, InspectionResultValue result, String note) {
        this.inspection = inspection;
        this.checklistItem = checklistItem;
        this.itemName = itemName;
        this.result = result;
        this.note = note;
        this.needsFaultReport = result == InspectionResultValue.FAIL;
    }
}
```

`repository/InspectionResultRepository.java`:
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InspectionResultRepository extends JpaRepository<InspectionResult, Long> {
    List<InspectionResult> findByInspectionIdOrderByChecklistItemItemOrderAsc(Long inspectionId);
}
```

- [ ] **Step 4: DTO 완성 및 수정**

`dto/InspectionResultResponse.java` (최종):
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.inspection.entity.InspectionResultValue;

public record InspectionResultResponse(
    Long id, Long checklistItemId, String itemName,
    InspectionResultValue result, String note, boolean needsFaultReport
) {
    public static InspectionResultResponse from(InspectionResult r) {
        return new InspectionResultResponse(
            r.getId(), r.getChecklistItem().getId(), r.getItemName(),
            r.getResult(), r.getNote(), r.isNeedsFaultReport()
        );
    }
}
```

`dto/InspectionResultRequest.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.InspectionResultValue;
import jakarta.validation.constraints.NotNull;

public record InspectionResultRequest(
    @NotNull Long checklistItemId,
    @NotNull InspectionResultValue result,
    String note
) {}
```

`dto/InspectionCompleteRequest.java`:
```java
package com.factorycare.backend.domain.inspection.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record InspectionCompleteRequest(
    @NotEmpty List<InspectionResultRequest> results
) {}
```

`dto/InspectionResponse.java` (최종 - 결과 포함):
```java
package com.factorycare.backend.domain.inspection.dto;

import com.factorycare.backend.domain.inspection.entity.Inspection;
import com.factorycare.backend.domain.inspection.entity.InspectionStatus;
import java.time.LocalDateTime;
import java.util.List;

public record InspectionResponse(
    Long id, Long scheduleId,
    Long inspectorId, String inspectorName,
    InspectionStatus status,
    boolean hasAbnormality,
    LocalDateTime completedAt,
    List<InspectionResultResponse> results,
    LocalDateTime createdAt
) {
    public static InspectionResponse from(Inspection i, List<InspectionResultResponse> results) {
        return new InspectionResponse(
            i.getId(), i.getSchedule().getId(),
            i.getInspector().getId(), i.getInspector().getName(),
            i.getStatus(), i.isHasAbnormality(),
            i.getCompletedAt(), results, i.getCreatedAt()
        );
    }

    public static InspectionResponse from(Inspection i) {
        return from(i, List.of());
    }
}
```

- [ ] **Step 5: Service 작성**

`service/InspectionService.java`:
```java
package com.factorycare.backend.domain.inspection.service;

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

    public InspectionService(InspectionRepository inspectionRepository,
                             InspectionResultRepository resultRepository,
                             InspectionChecklistItemRepository checklistItemRepository,
                             InspectionScheduleRepository scheduleRepository) {
        this.inspectionRepository = inspectionRepository;
        this.resultRepository = resultRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.scheduleRepository = scheduleRepository;
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

- [ ] **Step 6: Controller 작성**

`controller/InspectionController.java`:
```java
package com.factorycare.backend.domain.inspection.controller;

import com.factorycare.backend.domain.inspection.dto.*;
import com.factorycare.backend.domain.inspection.service.InspectionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspections")
public class InspectionController {

    private final InspectionService service;

    public InspectionController(InspectionService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<InspectionResponse>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<InspectionResponse> complete(
            @PathVariable Long id,
            @Valid @RequestBody InspectionCompleteRequest req) {
        return ResponseEntity.ok(service.complete(id, req));
    }
}
```

- [ ] **Step 7: 전체 테스트 실행**
```bash
cd backend && ./gradlew test --tests "*.Inspection*"
```
Expected: BUILD SUCCESSFUL, 11 tests passed

- [ ] **Step 8: 커밋**
```bash
git add backend/src/
git commit -m "feat(inspection): 점검 수행 API (complete + 이상 자동 플래그)"
```

---

### Task 6: Frontend 타입 + API 클라이언트

**Files:**
- Create: `frontend/src/types/inspection.ts`
- Create: `frontend/src/api/inspection.ts`

**Interfaces:**
- Produces: `inspectionChecklistApi`, `inspectionScheduleApi`, `inspectionApi`

- [ ] **Step 1: 타입 정의**

`frontend/src/types/inspection.ts`:
```typescript
export type InspectionScheduleStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
export type InspectionScheduleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
export type InspectionStatus = 'IN_PROGRESS' | 'COMPLETED'
export type InspectionResultValue = 'PASS' | 'FAIL' | 'SKIPPED'

export const SCHEDULE_STATUS_LABELS: Record<InspectionScheduleStatus, string> = {
  SCHEDULED: '예정',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  OVERDUE: '기한초과',
}

export const SCHEDULE_STATUS_COLORS: Record<InspectionScheduleStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
}

export const RESULT_COLORS: Record<InspectionResultValue, string> = {
  PASS: 'bg-green-100 text-green-800',
  FAIL: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-gray-100 text-gray-600',
}

export const SCHEDULE_TYPE_LABELS: Record<InspectionScheduleType, string> = {
  DAILY: '일간', WEEKLY: '주간', MONTHLY: '월간', CUSTOM: '수동',
}

export interface InspectionChecklistItem {
  id: number
  itemName: string
  itemOrder: number
}

export interface InspectionChecklist {
  id: number
  name: string
  description: string | null
  equipmentTypeName: string | null
  items: InspectionChecklistItem[]
  createdAt: string
}

export interface InspectionSchedule {
  id: number
  equipmentId: number
  equipmentName: string
  checklistId: number
  checklistName: string
  assigneeId: number
  assigneeName: string
  scheduledDate: string
  inspectionType: InspectionScheduleType
  status: InspectionScheduleStatus
  description: string | null
  createdAt: string
}

export interface InspectionResultItem {
  id: number
  checklistItemId: number
  itemName: string
  result: InspectionResultValue
  note: string | null
  needsFaultReport: boolean
}

export interface Inspection {
  id: number
  scheduleId: number
  inspectorId: number
  inspectorName: string
  status: InspectionStatus
  hasAbnormality: boolean
  completedAt: string | null
  results: InspectionResultItem[]
  createdAt: string
}

export interface InspectionChecklistCreateRequest {
  name: string
  description?: string
  equipmentTypeId?: number
  itemNames: string[]
}

export interface InspectionScheduleCreateRequest {
  equipmentId: number
  checklistId: number
  assigneeId: number
  scheduledDate: string
  inspectionType?: InspectionScheduleType
  description?: string
}

export interface InspectionCompleteRequest {
  results: Array<{
    checklistItemId: number
    result: InspectionResultValue
    note?: string
  }>
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
```

- [ ] **Step 2: API 클라이언트**

`frontend/src/api/inspection.ts`:
```typescript
import axiosInstance from './axiosInstance'
import type {
  InspectionChecklist,
  InspectionChecklistCreateRequest,
  InspectionSchedule,
  InspectionScheduleCreateRequest,
  Inspection,
  InspectionCompleteRequest,
  SpringPage,
  InspectionScheduleStatus,
} from '../types/inspection'

export const inspectionChecklistApi = {
  getAll: () =>
    axiosInstance.get<InspectionChecklist[]>('/inspection-checklists').then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<InspectionChecklist>(`/inspection-checklists/${id}`).then((r) => r.data),

  create: (data: InspectionChecklistCreateRequest) =>
    axiosInstance.post<InspectionChecklist>('/inspection-checklists', data).then((r) => r.data),

  update: (id: number, data: Partial<InspectionChecklistCreateRequest>) =>
    axiosInstance.patch<InspectionChecklist>(`/inspection-checklists/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/inspection-checklists/${id}`),
}

export const inspectionScheduleApi = {
  search: (params?: {
    equipmentId?: number
    assigneeId?: number
    status?: InspectionScheduleStatus
    from?: string
    to?: string
    page?: number
    size?: number
  }) =>
    axiosInstance.get<SpringPage<InspectionSchedule>>('/inspection-schedules', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<InspectionSchedule>(`/inspection-schedules/${id}`).then((r) => r.data),

  create: (data: InspectionScheduleCreateRequest) =>
    axiosInstance.post<InspectionSchedule>('/inspection-schedules', data).then((r) => r.data),

  update: (id: number, data: Partial<InspectionScheduleCreateRequest>) =>
    axiosInstance.patch<InspectionSchedule>(`/inspection-schedules/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/inspection-schedules/${id}`),

  start: (id: number) =>
    axiosInstance.post<Inspection>(`/inspection-schedules/${id}/start`).then((r) => r.data),
}

export const inspectionApi = {
  getAll: () =>
    axiosInstance.get<Inspection[]>('/inspections').then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Inspection>(`/inspections/${id}`).then((r) => r.data),

  complete: (id: number, data: InspectionCompleteRequest) =>
    axiosInstance.post<Inspection>(`/inspections/${id}/complete`, data).then((r) => r.data),
}
```

- [ ] **Step 3: 커밋**
```bash
git add frontend/src/types/inspection.ts frontend/src/api/inspection.ts
git commit -m "feat(inspection): 프론트엔드 타입 + API 클라이언트"
```

---

### Task 7: Frontend 체크리스트 관리 페이지

**Files:**
- Create: `frontend/src/pages/inspection/InspectionChecklistPage.tsx`

- [ ] **Step 1: 페이지 작성**

`frontend/src/pages/inspection/InspectionChecklistPage.tsx`:
```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionChecklistApi } from '../../api/inspection'

export default function InspectionChecklistPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemsText, setItemsText] = useState('')

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['inspection-checklists'],
    queryFn: inspectionChecklistApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: inspectionChecklistApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-checklists'] })
      setShowForm(false)
      setName('')
      setDescription('')
      setItemsText('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: inspectionChecklistApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspection-checklists'] }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const itemNames = itemsText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (itemNames.length === 0) return alert('점검 항목을 1개 이상 입력하세요.')
    createMutation.mutate({ name, description: description || undefined, itemNames })
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">체크리스트 템플릿</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? '취소' : '+ 새 템플릿'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">템플릿명 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="예: 컨베이어 일일 점검"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              점검 항목 * (한 줄에 하나씩)
            </label>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={5}
              className="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder={'모터 온도\n벨트 장력\n오일 누유'}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : (
        <div className="space-y-3">
          {checklists?.map((cl) => (
            <div key={cl.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{cl.name}</h3>
                  {cl.description && (
                    <p className="text-sm text-gray-500 mt-1">{cl.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cl.items.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                      >
                        {item.itemOrder}. {item.itemName}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(cl.id)
                  }}
                  className="text-sm text-red-500 hover:underline ml-4"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {checklists?.length === 0 && (
            <p className="text-center text-gray-400">등록된 체크리스트가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**
```bash
git add frontend/src/pages/inspection/InspectionChecklistPage.tsx
git commit -m "feat(inspection): 체크리스트 관리 페이지"
```

---

### Task 8: Frontend 점검 일정 페이지

**Files:**
- Create: `frontend/src/pages/inspection/InspectionScheduleListPage.tsx`
- Create: `frontend/src/pages/inspection/InspectionScheduleFormPage.tsx`

- [ ] **Step 1: 일정 목록 페이지**

`frontend/src/pages/inspection/InspectionScheduleListPage.tsx`:
```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { inspectionScheduleApi } from '../../api/inspection'
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_COLORS,
  SCHEDULE_TYPE_LABELS,
  type InspectionScheduleStatus,
} from '../../types/inspection'

const STATUS_OPTIONS: InspectionScheduleStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']

export default function InspectionScheduleListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<{ page: number; size: number; status?: InspectionScheduleStatus }>({
    page: 0,
    size: 10,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['inspection-schedules', params],
    queryFn: () => inspectionScheduleApi.search(params),
  })

  const startMutation = useMutation({
    mutationFn: inspectionScheduleApi.start,
    onSuccess: (inspection) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] })
      navigate(`/inspections/${inspection.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: inspectionScheduleApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] }),
  })

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">점검 일정</h1>
        <button
          onClick={() => navigate('/inspection-schedules/new')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          일정 등록
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <select
          value={params.status ?? ''}
          onChange={(e) =>
            setParams((p) => ({ ...p, page: 0, status: (e.target.value as InspectionScheduleStatus) || undefined }))
          }
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{SCHEDULE_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['설비', '체크리스트', '담당자', '예정일', '유형', '상태', '작업'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.content.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{s.equipmentName}</td>
                    <td className="px-4 py-3 text-gray-500">{s.checklistName}</td>
                    <td className="px-4 py-3 text-gray-500">{s.assigneeName}</td>
                    <td className="px-4 py-3 font-mono text-sm">{s.scheduledDate}</td>
                    <td className="px-4 py-3 text-gray-500">{SCHEDULE_TYPE_LABELS[s.inspectionType]}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCHEDULE_STATUS_COLORS[s.status]}`}>
                        {SCHEDULE_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {s.status === 'SCHEDULED' && (
                        <button
                          onClick={() => startMutation.mutate(s.id)}
                          className="text-blue-600 hover:underline"
                        >
                          점검 시작
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('삭제?')) deleteMutation.mutate(s.id) }}
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

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              disabled={data?.first}
              onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >이전</button>
            <span className="text-sm text-gray-600">
              {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1}
            </span>
            <button
              disabled={data?.last}
              onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >다음</button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 일정 등록 폼 페이지**

`frontend/src/pages/inspection/InspectionScheduleFormPage.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { inspectionChecklistApi, inspectionScheduleApi } from '../../api/inspection'
import { equipmentApi } from '../../api/equipment'
import type { InspectionScheduleType } from '../../types/inspection'

const TYPE_OPTIONS: InspectionScheduleType[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']
const TYPE_LABELS = { DAILY: '일간', WEEKLY: '주간', MONTHLY: '월간', CUSTOM: '수동' }

export default function InspectionScheduleFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    equipmentId: '',
    checklistId: '',
    assigneeId: '',
    scheduledDate: '',
    inspectionType: 'CUSTOM' as InspectionScheduleType,
    description: '',
  })

  const { data: equipments } = useQuery({
    queryKey: ['equipments-all'],
    queryFn: () => equipmentApi.search({ size: 100 }),
  })

  const { data: checklists } = useQuery({
    queryKey: ['inspection-checklists'],
    queryFn: inspectionChecklistApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: inspectionScheduleApi.create,
    onSuccess: () => navigate('/inspection-schedules'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      equipmentId: Number(form.equipmentId),
      checklistId: Number(form.checklistId),
      assigneeId: Number(form.assigneeId),
      scheduledDate: form.scheduledDate,
      inspectionType: form.inspectionType,
      description: form.description || undefined,
    })
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">점검 일정 등록</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설비 *</label>
          <select required value={form.equipmentId} onChange={set('equipmentId')}
            className="w-full rounded border px-3 py-2 text-sm">
            <option value="">설비 선택</option>
            {equipments?.content.map((e) => (
              <option key={e.id} value={e.id}>{e.name} ({e.equipmentNo})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">체크리스트 *</label>
          <select required value={form.checklistId} onChange={set('checklistId')}
            className="w-full rounded border px-3 py-2 text-sm">
            <option value="">체크리스트 선택</option>
            {checklists?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">담당자 ID *</label>
          <input required type="number" value={form.assigneeId} onChange={set('assigneeId')}
            className="w-full rounded border px-3 py-2 text-sm" placeholder="사용자 ID" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예정일 *</label>
          <input required type="date" value={form.scheduledDate} onChange={set('scheduledDate')}
            className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">점검 유형</label>
          <select value={form.inspectionType} onChange={set('inspectionType')}
            className="w-full rounded border px-3 py-2 text-sm">
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
          <textarea value={form.description} onChange={set('description')}
            rows={3} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={createMutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {createMutation.isPending ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**
```bash
git add frontend/src/pages/inspection/
git commit -m "feat(inspection): 점검 일정 목록 + 등록 페이지"
```

---

### Task 9: Frontend 점검 수행 페이지 + 라우터

**Files:**
- Create: `frontend/src/pages/inspection/InspectionDetailPage.tsx`
- Modify: `frontend/src/router/index.tsx`

- [ ] **Step 1: 점검 수행 페이지**

`frontend/src/pages/inspection/InspectionDetailPage.tsx`:
```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionApi, inspectionChecklistApi } from '../../api/inspection'
import { RESULT_COLORS, type InspectionResultValue } from '../../types/inspection'

const RESULT_OPTIONS: InspectionResultValue[] = ['PASS', 'FAIL', 'SKIPPED']
const RESULT_LABELS = { PASS: '정상', FAIL: '이상', SKIPPED: '미실시' }

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => inspectionApi.getById(Number(id)),
  })

  const { data: checklist } = useQuery({
    queryKey: ['inspection-checklist-for', inspection?.scheduleId],
    queryFn: async () => {
      if (!inspection) return null
      // 일정의 checklist 항목을 가져오기 위해 scheduleId 기반으로 조회하지 않고
      // inspection 결과가 없을 때 체크리스트 항목 목록을 schedule 정보로부터 가져옴
      return null
    },
    enabled: !!inspection && inspection.status === 'IN_PROGRESS' && inspection.results.length === 0,
  })

  const [resultMap, setResultMap] = useState<Record<number, { result: InspectionResultValue; note: string }>>({})

  const completeMutation = useMutation({
    mutationFn: (data: Parameters<typeof inspectionApi.complete>[1]) =>
      inspectionApi.complete(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection', id] })
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] })
    },
  })

  if (isLoading) return <div className="p-6 text-center text-gray-500">로딩 중...</div>
  if (!inspection) return <div className="p-6 text-center text-red-500">점검을 찾을 수 없습니다.</div>

  const isCompleted = inspection.status === 'COMPLETED'

  const handleComplete = () => {
    const results = Object.entries(resultMap).map(([itemId, v]) => ({
      checklistItemId: Number(itemId),
      result: v.result,
      note: v.note || undefined,
    }))
    if (results.length === 0) return alert('점검 결과를 입력하세요.')
    completeMutation.mutate({ results })
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">점검 수행</h1>
        <p className="text-sm text-gray-500 mt-1">담당자: {inspection.inspectorName}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${
            isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isCompleted ? '완료' : '진행중'}
          </span>
          {isCompleted && inspection.hasAbnormality && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              이상 발견
            </span>
          )}
        </div>
      </div>

      {isCompleted ? (
        <div className="space-y-3">
          <h2 className="font-medium text-gray-700">점검 결과</h2>
          {inspection.results.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{r.itemName}</p>
                {r.note && <p className="text-xs text-gray-500 mt-1">{r.note}</p>}
                {r.needsFaultReport && (
                  <span className="text-xs text-red-600 font-medium">⚠ 장애 보고 필요</span>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_COLORS[r.result]}`}>
                {RESULT_LABELS[r.result]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <ChecklistForm
          inspectionId={Number(id)}
          scheduleId={inspection.scheduleId}
          resultMap={resultMap}
          setResultMap={setResultMap}
          onComplete={handleComplete}
          isPending={completeMutation.isPending}
        />
      )}

      <button onClick={() => navigate(-1)} className="mt-6 text-sm text-gray-500 hover:underline">
        ← 돌아가기
      </button>
    </div>
  )
}

function ChecklistForm({
  inspectionId,
  scheduleId,
  resultMap,
  setResultMap,
  onComplete,
  isPending,
}: {
  inspectionId: number
  scheduleId: number
  resultMap: Record<number, { result: InspectionResultValue; note: string }>
  setResultMap: React.Dispatch<React.SetStateAction<typeof resultMap>>
  onComplete: () => void
  isPending: boolean
}) {
  // scheduleId로 해당 체크리스트 항목 불러오기
  const { data: scheduleDetail } = useQuery({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: async () => {
      const { inspectionScheduleApi } = await import('../../api/inspection')
      const schedule = await inspectionScheduleApi.getById(scheduleId)
      const checklist = await inspectionChecklistApi.getById(schedule.checklistId)
      return checklist
    },
  })

  return (
    <div className="space-y-3">
      <h2 className="font-medium text-gray-700">점검 항목 입력</h2>
      {scheduleDetail?.items.map((item) => {
        const val = resultMap[item.id] ?? { result: 'PASS' as InspectionResultValue, note: '' }
        return (
          <div key={item.id} className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm">{item.itemOrder}. {item.itemName}</p>
            <div className="flex gap-2">
              {RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setResultMap((m) => ({ ...m, [item.id]: { ...val, result: opt } }))}
                  className={`rounded px-3 py-1 text-xs font-medium border transition-colors ${
                    val.result === opt ? RESULT_COLORS[opt] + ' border-transparent' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {RESULT_LABELS[opt]}
                </button>
              ))}
            </div>
            {val.result === 'FAIL' && (
              <input
                value={val.note}
                onChange={(e) => setResultMap((m) => ({ ...m, [item.id]: { ...val, note: e.target.value } }))}
                placeholder="이상 내용 입력"
                className="w-full rounded border px-3 py-1 text-sm text-red-700"
              />
            )}
          </div>
        )
      })}
      {!scheduleDetail && <p className="text-gray-400 text-sm">체크리스트 항목 로딩 중...</p>}
      <button
        onClick={onComplete}
        disabled={isPending || !scheduleDetail}
        className="mt-4 rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? '저장 중...' : '점검 완료'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 라우터 등록**

`frontend/src/router/index.tsx` 수정:
```tsx
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
  { path: '*', element: <NotFoundPage /> },
])

export default router
```

- [ ] **Step 3: 프론트엔드 빌드 확인**
```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: ✓ built in ...

- [ ] **Step 4: 전체 백엔드 테스트**
```bash
cd backend && ./gradlew test 2>&1 | tail -20
```
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: 커밋**
```bash
git add frontend/src/
git commit -m "feat(inspection): 점검 수행 페이지 + 라우터 등록"
```

---

### Task 10: PR 생성

- [ ] **Step 1: 브랜치 push**
```bash
git push -u origin feat/inspection
```

- [ ] **Step 2: PR 생성**
```bash
gh pr create \
  --title "feat/inspection: 점검관리 API + 프론트엔드 (WBS 5.0~5.3)" \
  --body "## Summary
- 체크리스트 템플릿 CRUD (GET/POST/PATCH/DELETE /api/inspection-checklists)
- 점검 일정 CRUD + start (GET/POST/PATCH/DELETE /api/inspection-schedules + /start)
- 점검 수행 complete (POST /api/inspections/{id}/complete)
- FAIL 항목 자동 이상 플래그 (hasAbnormality, needsFaultReport)
- 프론트엔드 4페이지: 체크리스트관리/일정목록/일정등록/점검수행

## Test plan
- [ ] \`./gradlew test\` — InspectionChecklistControllerTest (5), InspectionScheduleControllerTest (4), InspectionControllerTest (4)
- [ ] \`npm run build\` — TypeScript 오류 없음
- [ ] 브라우저: /inspection-checklists 체크리스트 생성/삭제
- [ ] 브라우저: /inspection-schedules 일정 등록 → 점검 시작 → 결과 입력 → 완료"
```
