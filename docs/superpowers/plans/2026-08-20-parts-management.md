# 부품관리 (Parts Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WBS 8.0~8.3 — 부품 CRUD + 재고관리 + 유지보수 작업 중 부품 사용 등록/취소(재고 차감/복구) + 재고 부족 경고 표시 + 프론트엔드 3페이지 구현

**Architecture:** 기존 Equipment/Fault/Maintenance 패턴 동일 — Entity→Service→Controller, QueryDSL for 검색 (keyword/location/stockStatus 3조건), 재고 증감 로직은 Part 엔티티 내부 캡슐화. 브랜치: `feat/parts`.

**Tech Stack:** Spring Boot 4.1, Spring Security+JWT, QueryDSL, React+TypeScript+Vite, TanStack Query v5, Tailwind CSS, lucide-react

## Global Constraints

- 패키지 루트: `com.factorycare.backend.domain.part`
- 테스트: `@ActiveProfiles("test")`, H2 in-memory, `tools.jackson.databind.ObjectMapper`, `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`
- Entity: `@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)` + `@Builder` 생성자
- DTO: Java record + `static from(Entity)` 팩토리
- Controller: 생성자 주입, `@PreAuthorize` 역할 제어
- Frontend API: `axiosInstance` 사용, baseURL `/api` (기존 패턴)
- `GlobalExceptionHandler`: `IllegalStateException` → **409 CONFLICT**, `IllegalArgumentException` → 400
- `SpringPage<T>` 타입: `frontend/src/types/equipment.ts`에 정의됨 — 재정의 금지, import해서 사용
- Frontend UI: `Badge`, `Button`, `Card/CardHeader/CardTitle/CardContent/CardFooter` 컴포넌트 사용 (기존 패턴)

---

### Task 1: 브랜치 생성 + 엔티티 + QueryDSL 리포지토리

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/entity/StockStatus.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/entity/Part.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/entity/PartUsage.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/dto/PartSearchCondition.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/repository/PartRepository.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/repository/PartRepositoryCustom.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/repository/PartRepositoryImpl.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/repository/PartUsageRepository.java`

**Interfaces:**
- Produces: `Part` (id, partNo, name, manufacturer, stockQuantity, minimumStock, storageLocation, description, active, createdAt, updatedAt + domain methods decreaseStock/increaseStock/adjustStock/deactivate/getStockStatus), `PartUsage` (id, part, maintenanceTask, quantity, note, usedBy, usedAt)

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feat/parts
```

- [ ] **Step 2: StockStatus enum 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/entity/StockStatus.java`:
```java
package com.factorycare.backend.domain.part.entity;

public enum StockStatus {
    NORMAL,
    LOW,
    OUT
}
```

- [ ] **Step 3: Part 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/entity/Part.java`:
```java
package com.factorycare.backend.domain.part.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "parts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Part {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String partNo;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 100)
    private String manufacturer;

    @Column(nullable = false)
    private int stockQuantity;

    @Column(nullable = false)
    private int minimumStock = 0;

    @Column(length = 200)
    private String storageLocation;

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
    public Part(String partNo, String name, String manufacturer, int stockQuantity,
                int minimumStock, String storageLocation, String description) {
        this.partNo = partNo;
        this.name = name;
        this.manufacturer = manufacturer;
        this.stockQuantity = stockQuantity;
        this.minimumStock = minimumStock;
        this.storageLocation = storageLocation;
        this.description = description;
    }

    public void update(String name, String manufacturer, int minimumStock,
                       String storageLocation, String description) {
        if (name != null) this.name = name;
        if (manufacturer != null) this.manufacturer = manufacturer;
        this.minimumStock = minimumStock;
        if (storageLocation != null) this.storageLocation = storageLocation;
        if (description != null) this.description = description;
    }

    public void decreaseStock(int quantity) {
        if (this.stockQuantity < quantity) {
            throw new IllegalStateException(
                "재고가 부족합니다. 현재 재고: " + this.stockQuantity + ", 요청 수량: " + quantity);
        }
        this.stockQuantity -= quantity;
    }

    public void increaseStock(int quantity) {
        this.stockQuantity += quantity;
    }

    public void adjustStock(int newQuantity) {
        if (newQuantity < 0) throw new IllegalArgumentException("재고는 0 이상이어야 합니다.");
        this.stockQuantity = newQuantity;
    }

    public void deactivate() {
        this.active = false;
    }

    public StockStatus getStockStatus() {
        if (this.stockQuantity == 0) return StockStatus.OUT;
        if (this.stockQuantity <= this.minimumStock) return StockStatus.LOW;
        return StockStatus.NORMAL;
    }
}
```

- [ ] **Step 4: PartUsage 엔티티 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/entity/PartUsage.java`:
```java
package com.factorycare.backend.domain.part.entity;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "part_usages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PartUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_task_id", nullable = false)
    private MaintenanceTask maintenanceTask;

    @Column(nullable = false)
    private int quantity;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_by_id", nullable = false)
    private User usedBy;

    @Column(nullable = false)
    private LocalDateTime usedAt = LocalDateTime.now();

    @Builder
    public PartUsage(Part part, MaintenanceTask maintenanceTask,
                     int quantity, String note, User usedBy) {
        this.part = part;
        this.maintenanceTask = maintenanceTask;
        this.quantity = quantity;
        this.note = note;
        this.usedBy = usedBy;
    }
}
```

- [ ] **Step 5: PartSearchCondition + 리포지토리 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/dto/PartSearchCondition.java`:
```java
package com.factorycare.backend.domain.part.dto;

import com.factorycare.backend.domain.part.entity.StockStatus;

public record PartSearchCondition(
    String keyword,
    String storageLocation,
    StockStatus stockStatus
) {}
```

`backend/src/main/java/com/factorycare/backend/domain/part/repository/PartRepositoryCustom.java`:
```java
package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.dto.PartSearchCondition;
import com.factorycare.backend.domain.part.entity.Part;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PartRepositoryCustom {
    Page<Part> search(PartSearchCondition cond, Pageable pageable);
}
```

`backend/src/main/java/com/factorycare/backend/domain/part/repository/PartRepositoryImpl.java`:
```java
package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.dto.PartSearchCondition;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.QPart;
import com.factorycare.backend.domain.part.entity.StockStatus;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

public class PartRepositoryImpl implements PartRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public PartRepositoryImpl(JPAQueryFactory queryFactory) {
        this.queryFactory = queryFactory;
    }

    @Override
    public Page<Part> search(PartSearchCondition cond, Pageable pageable) {
        QPart qp = QPart.part;

        List<Part> content = queryFactory
            .selectFrom(qp)
            .where(
                qp.active.isTrue(),
                keywordContains(qp, cond.keyword()),
                locationContains(qp, cond.storageLocation()),
                stockStatusEq(qp, cond.stockStatus())
            )
            .orderBy(qp.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        Long total = queryFactory
            .select(qp.count())
            .from(qp)
            .where(
                qp.active.isTrue(),
                keywordContains(qp, cond.keyword()),
                locationContains(qp, cond.storageLocation()),
                stockStatusEq(qp, cond.stockStatus())
            )
            .fetchOne();

        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }

    private BooleanExpression keywordContains(QPart qp, String keyword) {
        return StringUtils.hasText(keyword)
            ? qp.name.containsIgnoreCase(keyword).or(qp.manufacturer.containsIgnoreCase(keyword))
            : null;
    }

    private BooleanExpression locationContains(QPart qp, String location) {
        return StringUtils.hasText(location) ? qp.storageLocation.containsIgnoreCase(location) : null;
    }

    private BooleanExpression stockStatusEq(QPart qp, StockStatus stockStatus) {
        if (stockStatus == null) return null;
        return switch (stockStatus) {
            case OUT -> qp.stockQuantity.eq(0);
            case LOW -> qp.stockQuantity.gt(0).and(qp.stockQuantity.loe(qp.minimumStock));
            case NORMAL -> qp.stockQuantity.gt(qp.minimumStock);
        };
    }
}
```

`backend/src/main/java/com/factorycare/backend/domain/part/repository/PartRepository.java`:
```java
package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.entity.Part;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PartRepository extends JpaRepository<Part, Long>, PartRepositoryCustom {
    Optional<Part> findByIdAndActiveTrue(Long id);

    @Query("SELECT COUNT(p) FROM Part p WHERE p.createdAt >= :start AND p.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
```

`backend/src/main/java/com/factorycare/backend/domain/part/repository/PartUsageRepository.java`:
```java
package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.entity.PartUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartUsageRepository extends JpaRepository<PartUsage, Long> {
    List<PartUsage> findByMaintenanceTaskId(Long maintenanceTaskId);
    List<PartUsage> findByPartId(Long partId);
}
```

- [ ] **Step 6: 컴파일 + Q클래스 생성 확인**

```bash
cd backend && ./gradlew compileJava
```
Expected: BUILD SUCCESSFUL (QPart, QPartUsage 자동 생성됨)

- [ ] **Step 7: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/part/
git commit -m "feat(parts): Part/PartUsage 엔티티 + QueryDSL 리포지토리"
```

---

### Task 2: DTO + Service + Controller + 통합 테스트

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/dto/PartResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/dto/PartCreateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/dto/PartUpdateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/dto/PartStockAdjustRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/dto/PartUsageResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/dto/PartUsageCreateRequest.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/service/PartService.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/service/PartUsageService.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/controller/PartController.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/part/controller/PartUsageController.java`
- Create: `backend/src/test/java/com/factorycare/backend/domain/part/PartControllerTest.java`

**Interfaces:**
- Consumes: `PartRepository`, `PartUsageRepository`, `MaintenanceRepository`, `UserRepository`
- Produces: REST API (`GET|POST /api/parts`, `GET|PATCH|DELETE /api/parts/{id}`, `PATCH /api/parts/{id}/stock`, `GET /api/parts/{id}/usages`, `GET|POST /api/maintenance/{id}/parts`, `DELETE /api/maintenance/{id}/parts/{usageId}`)

- [ ] **Step 1: 실패 테스트 작성**

`backend/src/test/java/com/factorycare/backend/domain/part/PartControllerTest.java`:
```java
package com.factorycare.backend.domain.part;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.repository.PartRepository;
import com.factorycare.backend.domain.part.repository.PartUsageRepository;
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
class PartControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired PartRepository partRepository;
    @Autowired PartUsageRepository partUsageRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String adminToken, managerToken, workerToken;
    User worker, manager;
    Equipment equipment;
    MaintenanceTask task;

    @BeforeEach
    void setUp() {
        partUsageRepository.deleteAll();
        partRepository.deleteAll();
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

        task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment)
            .title("테스트 작업").taskType(MaintenanceType.REPAIR)
            .createdBy(worker).build());
    }

    @Test
    @DisplayName("MANAGER가 부품 등록 → 201, partNo PT-로 시작")
    void create_asManager() throws Exception {
        var body = Map.of(
            "name", "볼베어링",
            "manufacturer", "NSK",
            "stockQuantity", 100,
            "minimumStock", 10,
            "storageLocation", "A-01"
        );
        mockMvc.perform(post("/api/parts")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.partNo", startsWith("PT-")))
            .andExpect(jsonPath("$.name").value("볼베어링"))
            .andExpect(jsonPath("$.stockStatus").value("NORMAL"))
            .andExpect(jsonPath("$.stockQuantity").value(100));
    }

    @Test
    @DisplayName("WORKER가 부품 등록 시도 → 403")
    void create_asWorker_403() throws Exception {
        var body = Map.of("name", "볼트", "stockQuantity", 50, "minimumStock", 5);
        mockMvc.perform(post("/api/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("keyword 검색 — 이름 포함")
    void search_byKeyword() throws Exception {
        partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링").manufacturer("NSK")
            .stockQuantity(100).minimumStock(10).build());
        partRepository.save(Part.builder()
            .partNo("PT-2026-002").name("오일씰").manufacturer("NOK")
            .stockQuantity(50).minimumStock(5).build());

        mockMvc.perform(get("/api/parts")
                .header("Authorization", workerToken)
                .param("keyword", "볼"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].name").value("볼베어링"));
    }

    @Test
    @DisplayName("stockStatus=LOW 필터 — 최소재고 이하 부품만")
    void search_byStockStatus_LOW() throws Exception {
        partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(5).minimumStock(10).build()); // LOW
        partRepository.save(Part.builder()
            .partNo("PT-2026-002").name("오일씰")
            .stockQuantity(50).minimumStock(5).build()); // NORMAL

        mockMvc.perform(get("/api/parts")
                .header("Authorization", workerToken)
                .param("stockStatus", "LOW"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].stockStatus").value("LOW"));
    }

    @Test
    @DisplayName("ADMIN이 부품 소프트 삭제 → 204, 목록에서 제외")
    void delete_soft() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(100).minimumStock(10).build());

        mockMvc.perform(delete("/api/parts/" + part.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/parts")
                .header("Authorization", workerToken))
            .andExpect(jsonPath("$.content.length()").value(0));
    }

    @Test
    @DisplayName("MANAGER가 재고 조정 → stockQuantity 변경")
    void adjustStock() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(10).minimumStock(5).build());

        mockMvc.perform(patch("/api/parts/" + part.getId() + "/stock")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("newQuantity", 200))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stockQuantity").value(200))
            .andExpect(jsonPath("$.stockStatus").value("NORMAL"));
    }

    @Test
    @DisplayName("WORKER가 부품 사용 등록 → 재고 차감 + 사용 목록 1건")
    void addPartUsage_stockDecreased() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(100).minimumStock(10).build());

        var body = Map.of("partId", part.getId(), "quantity", 3, "note", "모터 교체");
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.partName").value("볼베어링"))
            .andExpect(jsonPath("$.quantity").value(3));

        mockMvc.perform(get("/api/parts/" + part.getId())
                .header("Authorization", workerToken))
            .andExpect(jsonPath("$.stockQuantity").value(97));
    }

    @Test
    @DisplayName("재고 초과 사용 → 409")
    void addPartUsage_insufficientStock_409() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(2).minimumStock(0).build());

        var body = Map.of("partId", part.getId(), "quantity", 10);
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("부품 사용 삭제 → 재고 복구")
    void deletePartUsage_stockRestored() throws Exception {
        Part part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("볼베어링")
            .stockQuantity(100).minimumStock(10).build());

        var body = Map.of("partId", part.getId(), "quantity", 5);
        String response = mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        Long usageId = objectMapper.readTree(response).get("id").longValue();

        mockMvc.perform(delete("/api/maintenance/" + task.getId() + "/parts/" + usageId)
                .header("Authorization", workerToken))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/parts/" + part.getId())
                .header("Authorization", workerToken))
            .andExpect(jsonPath("$.stockQuantity").value(100));
    }
}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd backend && ./gradlew test --tests "*.PartControllerTest" 2>&1 | tail -10
```
Expected: FAILED (컨트롤러/서비스 없음)

- [ ] **Step 3: DTO 6개 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/dto/PartResponse.java`:
```java
package com.factorycare.backend.domain.part.dto;

import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.StockStatus;
import java.time.LocalDateTime;

public record PartResponse(
    Long id,
    String partNo,
    String name,
    String manufacturer,
    int stockQuantity,
    int minimumStock,
    String storageLocation,
    String description,
    StockStatus stockStatus,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static PartResponse from(Part p) {
        return new PartResponse(
            p.getId(), p.getPartNo(), p.getName(), p.getManufacturer(),
            p.getStockQuantity(), p.getMinimumStock(), p.getStorageLocation(),
            p.getDescription(), p.getStockStatus(), p.isActive(),
            p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
```

`backend/src/main/java/com/factorycare/backend/domain/part/dto/PartCreateRequest.java`:
```java
package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PartCreateRequest(
    @NotBlank String name,
    String manufacturer,
    @NotNull @Min(0) Integer stockQuantity,
    @Min(0) int minimumStock,
    String storageLocation,
    String description
) {}
```

`backend/src/main/java/com/factorycare/backend/domain/part/dto/PartUpdateRequest.java`:
```java
package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;

public record PartUpdateRequest(
    String name,
    String manufacturer,
    @Min(0) int minimumStock,
    String storageLocation,
    String description
) {}
```

`backend/src/main/java/com/factorycare/backend/domain/part/dto/PartStockAdjustRequest.java`:
```java
package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PartStockAdjustRequest(@NotNull @Min(0) Integer newQuantity) {}
```

`backend/src/main/java/com/factorycare/backend/domain/part/dto/PartUsageResponse.java`:
```java
package com.factorycare.backend.domain.part.dto;

import com.factorycare.backend.domain.part.entity.PartUsage;
import java.time.LocalDateTime;

public record PartUsageResponse(
    Long id,
    Long partId,
    String partName,
    String partNo,
    Long maintenanceTaskId,
    String maintenanceTaskNo,
    int quantity,
    String note,
    String usedByName,
    LocalDateTime usedAt
) {
    public static PartUsageResponse from(PartUsage u) {
        return new PartUsageResponse(
            u.getId(),
            u.getPart().getId(),
            u.getPart().getName(),
            u.getPart().getPartNo(),
            u.getMaintenanceTask().getId(),
            u.getMaintenanceTask().getTaskNo(),
            u.getQuantity(),
            u.getNote(),
            u.getUsedBy().getName(),
            u.getUsedAt()
        );
    }
}
```

`backend/src/main/java/com/factorycare/backend/domain/part/dto/PartUsageCreateRequest.java`:
```java
package com.factorycare.backend.domain.part.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PartUsageCreateRequest(
    @NotNull Long partId,
    @NotNull @Min(1) Integer quantity,
    String note
) {}
```

- [ ] **Step 4: PartService 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/service/PartService.java`:
```java
package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.part.dto.*;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.repository.PartRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
public class PartService {

    private final PartRepository partRepository;

    public PartService(PartRepository partRepository) {
        this.partRepository = partRepository;
    }

    @Transactional(readOnly = true)
    public Page<PartResponse> search(PartSearchCondition cond, Pageable pageable) {
        return partRepository.search(cond, pageable).map(PartResponse::from);
    }

    @Transactional(readOnly = true)
    public PartResponse findById(Long id) {
        return PartResponse.from(getActivePart(id));
    }

    @Transactional
    public PartResponse create(PartCreateRequest req) {
        Part part = Part.builder()
            .partNo(generatePartNo())
            .name(req.name())
            .manufacturer(req.manufacturer())
            .stockQuantity(req.stockQuantity())
            .minimumStock(req.minimumStock())
            .storageLocation(req.storageLocation())
            .description(req.description())
            .build();
        return PartResponse.from(partRepository.save(part));
    }

    @Transactional
    public PartResponse update(Long id, PartUpdateRequest req) {
        Part part = getActivePart(id);
        part.update(req.name(), req.manufacturer(), req.minimumStock(),
                    req.storageLocation(), req.description());
        return PartResponse.from(part);
    }

    @Transactional
    public PartResponse adjustStock(Long id, PartStockAdjustRequest req) {
        Part part = getActivePart(id);
        part.adjustStock(req.newQuantity());
        return PartResponse.from(part);
    }

    @Transactional
    public void delete(Long id) {
        Part part = getActivePart(id);
        part.deactivate();
    }

    private Part getActivePart(Long id) {
        return partRepository.findByIdAndActiveTrue(id)
            .orElseThrow(() -> new IllegalArgumentException("부품을 찾을 수 없습니다. id=" + id));
    }

    private String generatePartNo() {
        int year = LocalDate.now().getYear();
        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(year + 1, 1, 1).atStartOfDay();
        long count = partRepository.countByCreatedAtBetween(start, end);
        return String.format("PT-%d-%03d", year, count + 1);
    }
}
```

- [ ] **Step 5: PartUsageService 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/service/PartUsageService.java`:
```java
package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.part.dto.PartUsageCreateRequest;
import com.factorycare.backend.domain.part.dto.PartUsageResponse;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.PartUsage;
import com.factorycare.backend.domain.part.repository.PartRepository;
import com.factorycare.backend.domain.part.repository.PartUsageRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PartUsageService {

    private final PartUsageRepository partUsageRepository;
    private final PartRepository partRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final UserRepository userRepository;

    public PartUsageService(PartUsageRepository partUsageRepository,
                            PartRepository partRepository,
                            MaintenanceRepository maintenanceRepository,
                            UserRepository userRepository) {
        this.partUsageRepository = partUsageRepository;
        this.partRepository = partRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<PartUsageResponse> findByMaintenanceId(Long maintenanceId) {
        return partUsageRepository.findByMaintenanceTaskId(maintenanceId).stream()
            .map(PartUsageResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PartUsageResponse> findByPartId(Long partId) {
        return partUsageRepository.findByPartId(partId).stream()
            .map(PartUsageResponse::from).toList();
    }

    @Transactional
    public PartUsageResponse create(Long maintenanceId, PartUsageCreateRequest req, Long userId) {
        MaintenanceTask task = maintenanceRepository.findById(maintenanceId)
            .orElseThrow(() -> new IllegalArgumentException("유지보수 작업을 찾을 수 없습니다. id=" + maintenanceId));
        if (task.getStatus() == MaintenanceStatus.COMPLETED
                || task.getStatus() == MaintenanceStatus.CANCELLED) {
            throw new IllegalStateException("완료 또는 취소된 작업에는 부품을 추가할 수 없습니다.");
        }
        Part part = partRepository.findByIdAndActiveTrue(req.partId())
            .orElseThrow(() -> new IllegalArgumentException("부품을 찾을 수 없습니다. id=" + req.partId()));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + userId));

        part.decreaseStock(req.quantity());

        PartUsage usage = PartUsage.builder()
            .part(part).maintenanceTask(task)
            .quantity(req.quantity()).note(req.note())
            .usedBy(user).build();

        return PartUsageResponse.from(partUsageRepository.save(usage));
    }

    @Transactional
    public void delete(Long maintenanceId, Long usageId) {
        PartUsage usage = partUsageRepository.findById(usageId)
            .orElseThrow(() -> new IllegalArgumentException("부품 사용 이력을 찾을 수 없습니다. id=" + usageId));
        if (!usage.getMaintenanceTask().getId().equals(maintenanceId)) {
            throw new IllegalArgumentException("해당 유지보수 작업의 이력이 아닙니다.");
        }
        if (usage.getMaintenanceTask().getStatus() == MaintenanceStatus.COMPLETED) {
            throw new IllegalStateException("완료된 작업의 부품 사용 이력은 삭제할 수 없습니다.");
        }
        usage.getPart().increaseStock(usage.getQuantity());
        partUsageRepository.delete(usage);
    }
}
```

- [ ] **Step 6: PartController 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/controller/PartController.java`:
```java
package com.factorycare.backend.domain.part.controller;

import com.factorycare.backend.domain.part.dto.*;
import com.factorycare.backend.domain.part.entity.StockStatus;
import com.factorycare.backend.domain.part.service.PartService;
import com.factorycare.backend.domain.part.service.PartUsageService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/parts")
public class PartController {

    private final PartService partService;
    private final PartUsageService partUsageService;

    public PartController(PartService partService, PartUsageService partUsageService) {
        this.partService = partService;
        this.partUsageService = partUsageService;
    }

    @GetMapping
    public ResponseEntity<Page<PartResponse>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String storageLocation,
            @RequestParam(required = false) StockStatus stockStatus,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(partService.search(
            new PartSearchCondition(keyword, storageLocation, stockStatus), pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PartResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(partService.findById(id));
    }

    @GetMapping("/{id}/usages")
    public ResponseEntity<List<PartUsageResponse>> getUsages(@PathVariable Long id) {
        return ResponseEntity.ok(partUsageService.findByPartId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PartResponse> create(@Valid @RequestBody PartCreateRequest req) {
        PartResponse res = partService.create(req);
        return ResponseEntity.created(URI.create("/api/parts/" + res.id())).body(res);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PartResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody PartUpdateRequest req) {
        return ResponseEntity.ok(partService.update(id, req));
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<PartResponse> adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody PartStockAdjustRequest req) {
        return ResponseEntity.ok(partService.adjustStock(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        partService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 7: PartUsageController 작성**

`backend/src/main/java/com/factorycare/backend/domain/part/controller/PartUsageController.java`:
```java
package com.factorycare.backend.domain.part.controller;

import com.factorycare.backend.domain.part.dto.PartUsageCreateRequest;
import com.factorycare.backend.domain.part.dto.PartUsageResponse;
import com.factorycare.backend.domain.part.service.PartUsageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance/{maintenanceId}/parts")
public class PartUsageController {

    private final PartUsageService partUsageService;

    public PartUsageController(PartUsageService partUsageService) {
        this.partUsageService = partUsageService;
    }

    @GetMapping
    public ResponseEntity<List<PartUsageResponse>> getList(@PathVariable Long maintenanceId) {
        return ResponseEntity.ok(partUsageService.findByMaintenanceId(maintenanceId));
    }

    @PostMapping
    public ResponseEntity<PartUsageResponse> create(
            @PathVariable Long maintenanceId,
            @Valid @RequestBody PartUsageCreateRequest req,
            @AuthenticationPrincipal Long userId) {
        PartUsageResponse res = partUsageService.create(maintenanceId, req, userId);
        return ResponseEntity.created(
            URI.create("/api/maintenance/" + maintenanceId + "/parts/" + res.id()))
            .body(res);
    }

    @DeleteMapping("/{usageId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long maintenanceId,
            @PathVariable Long usageId) {
        partUsageService.delete(maintenanceId, usageId);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 8: 테스트 실행 → 전체 통과 확인**

```bash
cd backend && ./gradlew test --tests "*.PartControllerTest"
```
Expected: BUILD SUCCESSFUL, 8 tests passed

- [ ] **Step 9: 기존 테스트 회귀 확인**

```bash
cd backend && ./gradlew test
```
Expected: BUILD SUCCESSFUL, 모든 기존 테스트 포함 통과

- [ ] **Step 10: 커밋**

```bash
git add backend/src/
git commit -m "feat(parts): 부품 CRUD + 재고관리 + 부품사용 API + 통합 테스트"
```

---

### Task 3: Frontend 타입 + API 클라이언트

**Files:**
- Create: `frontend/src/types/parts.ts`
- Create: `frontend/src/api/parts.ts`

**Interfaces:**
- Consumes: `SpringPage<T>` from `../types/equipment`
- Produces: `partApi` (search, getById, getUsages, create, update, adjustStock, delete), `partUsageApi` (list, create, delete), 타입 상수 `STOCK_STATUS_LABELS`

- [ ] **Step 1: 타입 정의 작성**

`frontend/src/types/parts.ts`:
```typescript
import type { SpringPage } from './equipment'

export type { SpringPage }

export type StockStatus = 'NORMAL' | 'LOW' | 'OUT'

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  NORMAL: '정상',
  LOW: '부족',
  OUT: '소진',
}

export interface Part {
  id: number
  partNo: string
  name: string
  manufacturer: string | null
  stockQuantity: number
  minimumStock: number
  storageLocation: string | null
  description: string | null
  stockStatus: StockStatus
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PartUsage {
  id: number
  partId: number
  partName: string
  partNo: string
  maintenanceTaskId: number
  maintenanceTaskNo: string
  quantity: number
  note: string | null
  usedByName: string
  usedAt: string
}

export interface PartCreateRequest {
  name: string
  manufacturer?: string
  stockQuantity: number
  minimumStock?: number
  storageLocation?: string
  description?: string
}

export interface PartUpdateRequest {
  name?: string
  manufacturer?: string
  minimumStock?: number
  storageLocation?: string
  description?: string
}

export interface PartStockAdjustRequest {
  newQuantity: number
}

export interface PartUsageCreateRequest {
  partId: number
  quantity: number
  note?: string
}

export interface PartSearchParams {
  keyword?: string
  storageLocation?: string
  stockStatus?: StockStatus
  page?: number
  size?: number
}
```

- [ ] **Step 2: API 클라이언트 작성**

`frontend/src/api/parts.ts`:
```typescript
import axiosInstance from './axiosInstance'
import type {
  Part,
  PartUsage,
  PartCreateRequest,
  PartUpdateRequest,
  PartStockAdjustRequest,
  PartUsageCreateRequest,
  PartSearchParams,
  SpringPage,
} from '../types/parts'

export const partApi = {
  search: (params?: PartSearchParams) =>
    axiosInstance.get<SpringPage<Part>>('/parts', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Part>(`/parts/${id}`).then((r) => r.data),

  getUsages: (id: number) =>
    axiosInstance.get<PartUsage[]>(`/parts/${id}/usages`).then((r) => r.data),

  create: (data: PartCreateRequest) =>
    axiosInstance.post<Part>('/parts', data).then((r) => r.data),

  update: (id: number, data: PartUpdateRequest) =>
    axiosInstance.patch<Part>(`/parts/${id}`, data).then((r) => r.data),

  adjustStock: (id: number, data: PartStockAdjustRequest) =>
    axiosInstance.patch<Part>(`/parts/${id}/stock`, data).then((r) => r.data),

  delete: (id: number) =>
    axiosInstance.delete(`/parts/${id}`),
}

export const partUsageApi = {
  list: (maintenanceId: number) =>
    axiosInstance.get<PartUsage[]>(`/maintenance/${maintenanceId}/parts`).then((r) => r.data),

  create: (maintenanceId: number, data: PartUsageCreateRequest) =>
    axiosInstance.post<PartUsage>(`/maintenance/${maintenanceId}/parts`, data).then((r) => r.data),

  delete: (maintenanceId: number, usageId: number) =>
    axiosInstance.delete(`/maintenance/${maintenanceId}/parts/${usageId}`),
}
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/types/parts.ts frontend/src/api/parts.ts
git commit -m "feat(parts): 프론트엔드 타입 + API 클라이언트"
```

---

### Task 4: PartListPage + PartFormPage

**Files:**
- Create: `frontend/src/pages/parts/PartListPage.tsx`
- Create: `frontend/src/pages/parts/PartFormPage.tsx`

**Interfaces:**
- Consumes: `partApi.search`, `partApi.create`, `partApi.update`, `partApi.getById`, `STOCK_STATUS_LABELS` from `../../types/parts`
- Produces: `/parts` 목록 페이지 (재고부족 배지), `/parts/new` 등록, `/parts/:id/edit` 수정

- [ ] **Step 1: PartListPage 작성**

`frontend/src/pages/parts/PartListPage.tsx`:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { partApi } from '../../api/parts'
import { STOCK_STATUS_LABELS, type StockStatus } from '../../types/parts'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

const stockVariant: Record<StockStatus, 'success' | 'orange' | 'destructive'> = {
  NORMAL: 'success',
  LOW: 'orange',
  OUT: 'destructive',
}

export default function PartListPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [stockStatus, setStockStatus] = useState<StockStatus | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['parts', { keyword, storageLocation, stockStatus, page }],
    queryFn: () =>
      partApi.search({
        keyword: keyword || undefined,
        storageLocation: storageLocation || undefined,
        stockStatus: stockStatus || undefined,
        page,
      }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">부품 관리</h1>
        <Button onClick={() => navigate('/parts/new')}>부품 등록</Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="부품명 / 제조사"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <input
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="보관위치"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <select
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value as StockStatus | '')
                setPage(0)
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">전체 재고상태</option>
              <option value="NORMAL">정상</option>
              <option value="LOW">부족</option>
              <option value="OUT">소진</option>
            </select>
            <Button type="submit" variant="outline">검색</Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">로딩 중...</p>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">부품번호</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">부품명</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">제조사</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">재고</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">최소재고</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">재고상태</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">보관위치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.content.map((part) => (
                    <tr key={part.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {part.partNo}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/parts/${part.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {part.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{part.manufacturer ?? '-'}</td>
                      <td className="px-4 py-3 font-medium">{part.stockQuantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{part.minimumStock}</td>
                      <td className="px-4 py-3">
                        <Badge variant={stockVariant[part.stockStatus]}>
                          {STOCK_STATUS_LABELS[part.stockStatus]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{part.storageLocation ?? '-'}</td>
                    </tr>
                  ))}
                  {!data?.content.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        등록된 부품이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                이전
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                {page + 1} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages - 1}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: PartFormPage 작성**

`frontend/src/pages/parts/PartFormPage.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { partApi } from '../../api/parts'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

export default function PartFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: '',
    manufacturer: '',
    stockQuantity: 0,
    minimumStock: 0,
    storageLocation: '',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)

  const { data: existing } = useQuery({
    queryKey: ['parts', id],
    queryFn: () => partApi.getById(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        manufacturer: existing.manufacturer ?? '',
        stockQuantity: existing.stockQuantity,
        minimumStock: existing.minimumStock,
        storageLocation: existing.storageLocation ?? '',
        description: existing.description ?? '',
      })
    }
  }, [existing])

  const createMutation = useMutation({
    mutationFn: () =>
      partApi.create({
        name: form.name,
        manufacturer: form.manufacturer || undefined,
        stockQuantity: form.stockQuantity,
        minimumStock: form.minimumStock,
        storageLocation: form.storageLocation || undefined,
        description: form.description || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      navigate(`/parts/${res.id}`)
    },
    onError: () => setError('부품 등록에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      partApi.update(Number(id), {
        name: form.name,
        manufacturer: form.manufacturer || undefined,
        minimumStock: form.minimumStock,
        storageLocation: form.storageLocation || undefined,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      navigate(`/parts/${id}`)
    },
    onError: () => setError('부품 수정에 실패했습니다.'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? '부품 수정' : '부품 등록'}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              isEdit ? updateMutation.mutate() : createMutation.mutate()
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">부품명 *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                placeholder="볼베어링 6204"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">제조사</label>
              <input
                value={form.manufacturer}
                onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                className={inputCls}
                placeholder="NSK"
              />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium mb-1">초기 재고수량 *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stockQuantity: Number(e.target.value) }))
                  }
                  className={inputCls}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">최소재고 (경고 기준)</label>
              <input
                type="number"
                min={0}
                value={form.minimumStock}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minimumStock: Number(e.target.value) }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">보관위치</label>
              <input
                value={form.storageLocation}
                onChange={(e) => setForm((f) => ({ ...f, storageLocation: e.target.value }))}
                className={inputCls}
                placeholder="A-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">설명</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEdit ? `/parts/${id}` : '/parts')}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
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
git add frontend/src/pages/parts/
git commit -m "feat(parts): PartListPage + PartFormPage"
```

---

### Task 5: PartDetailPage + MaintenanceDetailPage 수정 + 라우터 + Layout

**Files:**
- Create: `frontend/src/pages/parts/PartDetailPage.tsx`
- Modify: `frontend/src/pages/maintenance/MaintenanceDetailPage.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/components/Layout.tsx`

**Interfaces:**
- Consumes: `partApi.getById`, `partApi.getUsages`, `partApi.adjustStock`, `partApi.delete`, `partUsageApi.list`, `partUsageApi.create`, `partUsageApi.delete`, `STOCK_STATUS_LABELS` from `../../types/parts`
- Produces: `/parts/:id` 상세 (재고조정 모달 + 사용이력), `MaintenanceDetailPage`에 "사용 부품" 섹션 + 모달, 라우터 3개 경로, 사이드바 메뉴

- [ ] **Step 1: PartDetailPage 작성**

`frontend/src/pages/parts/PartDetailPage.tsx`:
```tsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { partApi } from '../../api/parts'
import { STOCK_STATUS_LABELS } from '../../types/parts'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/card'

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showStockModal, setShowStockModal] = useState(false)
  const [newQuantity, setNewQuantity] = useState('')

  const { data: part, isLoading } = useQuery({
    queryKey: ['parts', id],
    queryFn: () => partApi.getById(Number(id)),
  })

  const { data: usages } = useQuery({
    queryKey: ['parts', id, 'usages'],
    queryFn: () => partApi.getUsages(Number(id)),
    enabled: !!id,
  })

  const adjustStockMutation = useMutation({
    mutationFn: () => partApi.adjustStock(Number(id), { newQuantity: Number(newQuantity) }),
    onSuccess: () => {
      setShowStockModal(false)
      setNewQuantity('')
      queryClient.invalidateQueries({ queryKey: ['parts', id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => partApi.delete(Number(id)),
    onSuccess: () => navigate('/parts'),
  })

  if (isLoading) return <p className="p-6 text-muted-foreground">로딩 중...</p>
  if (!part) return <p className="p-6 text-muted-foreground">부품을 찾을 수 없습니다.</p>

  const stockVariant =
    part.stockStatus === 'OUT'
      ? 'destructive'
      : part.stockStatus === 'LOW'
        ? 'orange'
        : 'success'

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-1">{part.partNo}</p>
          <h1 className="text-2xl font-bold tracking-tight">{part.name}</h1>
          {part.manufacturer && (
            <p className="text-sm text-muted-foreground mt-1">{part.manufacturer}</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => navigate(`/parts/${id}/edit`)}>
            수정
          </Button>
          <Button onClick={() => setShowStockModal(true)}>재고 조정</Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm('삭제하시겠습니까?')) deleteMutation.mutate()
            }}
          >
            삭제
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>부품 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">현재 재고</p>
              <p className="text-2xl font-bold">{part.stockQuantity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">재고 상태</p>
              <Badge variant={stockVariant}>{STOCK_STATUS_LABELS[part.stockStatus]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">최소재고</p>
              <p className="text-sm font-medium">{part.minimumStock}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">보관위치</p>
              <p className="text-sm font-medium">{part.storageLocation ?? '-'}</p>
            </div>
          </div>
          {part.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">설명</p>
              <p className="text-sm whitespace-pre-wrap">{part.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사용 이력</CardTitle>
        </CardHeader>
        <CardContent>
          {!usages?.length ? (
            <p className="text-sm text-muted-foreground">사용 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">작업번호</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">수량</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">메모</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">등록자</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">등록일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usages.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2">
                        <Link
                          to={`/maintenance/${u.maintenanceTaskId}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {u.maintenanceTaskNo}
                        </Link>
                      </td>
                      <td className="py-2 font-medium">{u.quantity}</td>
                      <td className="py-2 text-muted-foreground">{u.note ?? '-'}</td>
                      <td className="py-2 text-muted-foreground">{u.usedByName}</td>
                      <td className="py-2 text-muted-foreground text-xs">
                        {new Date(u.usedAt).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle>재고 조정</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                현재 재고: <span className="font-bold text-foreground">{part.stockQuantity}</span>
              </p>
              <input
                type="number"
                min={0}
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className={inputCls}
                placeholder="새 재고 수량"
                autoFocus
              />
            </CardContent>
            <CardFooter className="gap-3">
              <Button
                onClick={() => adjustStockMutation.mutate()}
                disabled={newQuantity === '' || adjustStockMutation.isPending}
                className="flex-1"
              >
                확인
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowStockModal(false)
                  setNewQuantity('')
                }}
                className="flex-1"
              >
                취소
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: MaintenanceDetailPage에 "사용 부품" 섹션 추가**

`frontend/src/pages/maintenance/MaintenanceDetailPage.tsx` — 파일 전체 교체:
```tsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '../../api/maintenance'
import { partApi, partUsageApi } from '../../api/parts'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus,
  type MaintenancePriority,
} from '../../types/maintenance'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

const statusVariant: Record<MaintenanceStatus, 'warning' | 'info' | 'success' | 'secondary'> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'secondary',
}

const priorityVariant: Record<MaintenancePriority, 'secondary' | 'warning' | 'orange' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'warning',
  HIGH: 'orange',
  CRITICAL: 'destructive',
}

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showStartModal, setShowStartModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showAddPartModal, setShowAddPartModal] = useState(false)
  const [startContent, setStartContent] = useState('')
  const [completeContent, setCompleteContent] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [partKeyword, setPartKeyword] = useState('')
  const [selectedPartId, setSelectedPartId] = useState<number | ''>('')
  const [partQuantity, setPartQuantity] = useState(1)
  const [partNote, setPartNote] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceApi.getById(Number(id)),
  })

  const { data: partUsages, refetch: refetchUsages } = useQuery({
    queryKey: ['maintenance', id, 'parts'],
    queryFn: () => partUsageApi.list(Number(id)),
    enabled: !!id,
  })

  const { data: partSearchResult } = useQuery({
    queryKey: ['parts', 'search', partKeyword],
    queryFn: () => partApi.search({ keyword: partKeyword || undefined, size: 20 }),
    enabled: showAddPartModal,
  })

  const selectedPart = partSearchResult?.content.find((p) => p.id === selectedPartId)

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

  const addPartMutation = useMutation({
    mutationFn: () =>
      partUsageApi.create(Number(id), {
        partId: Number(selectedPartId),
        quantity: partQuantity,
        note: partNote || undefined,
      }),
    onSuccess: () => {
      setShowAddPartModal(false)
      setSelectedPartId('')
      setPartQuantity(1)
      setPartNote('')
      setPartKeyword('')
      refetchUsages()
    },
  })

  const removePartMutation = useMutation({
    mutationFn: (usageId: number) => partUsageApi.delete(Number(id), usageId),
    onSuccess: () => refetchUsages(),
  })

  if (isLoading) return <p className="p-6 text-muted-foreground">로딩 중...</p>
  if (!task) return <p className="p-6 text-muted-foreground">작업을 찾을 수 없습니다.</p>

  const isPending = task.status === 'PENDING'
  const isInProgress = task.status === 'IN_PROGRESS'
  const isDone = task.status === 'COMPLETED' || task.status === 'CANCELLED'

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-mono mb-1">{task.taskNo}</p>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={statusVariant[task.status]}>{MAINTENANCE_STATUS_LABELS[task.status]}</Badge>
            <Badge variant={priorityVariant[task.priority]}>{MAINTENANCE_PRIORITY_LABELS[task.priority]}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{task.equipmentName}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          {isPending && <Button onClick={() => setShowStartModal(true)}>작업 시작</Button>}
          {isInProgress && (
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => setShowCompleteModal(true)}
            >작업 완료</Button>
          )}
          {!isDone && (
            <Button
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={() => { if (confirm('취소하시겠습니까?')) cancelMutation.mutate() }}
            >취소</Button>
          )}
          {isPending && (
            <Button
              variant="destructive"
              onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate() }}
            >삭제</Button>
          )}
        </div>
      </div>

      {/* 작업 정보 */}
      <Card className="mb-6">
        <CardHeader><CardTitle>작업 정보</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">상태</p>
              <Badge variant={statusVariant[task.status]}>{MAINTENANCE_STATUS_LABELS[task.status]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">우선순위</p>
              <Badge variant={priorityVariant[task.priority]}>{MAINTENANCE_PRIORITY_LABELS[task.priority]}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">작업 유형</p>
              <p className="text-sm font-medium">{MAINTENANCE_TYPE_LABELS[task.taskType]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">담당자</p>
              <p className="text-sm font-medium">{task.assigneeName ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">예정일</p>
              <p className="text-sm">{task.scheduledDate ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">등록자</p>
              <p className="text-sm">{task.createdByName}</p>
            </div>
            {task.faultId && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">연관 장애</p>
                <Link to={`/faults/${task.faultId}`} className="text-sm text-primary hover:underline">
                  장애 #{task.faultId} 보기
                </Link>
              </div>
            )}
            {task.completedAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">완료일시</p>
                <p className="text-sm">{new Date(task.completedAt).toLocaleString('ko-KR')}</p>
              </div>
            )}
          </div>
          {task.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">설명</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 사용 부품 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>사용 부품</CardTitle>
            {!isDone && (
              <Button size="sm" onClick={() => setShowAddPartModal(true)}>부품 추가</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!partUsages?.length ? (
            <p className="text-sm text-muted-foreground">등록된 사용 부품이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">부품명</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">부품번호</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">수량</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">메모</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">등록자</th>
                    {!isDone && <th className="pb-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {partUsages.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2">
                        <Link to={`/parts/${u.partId}`} className="text-primary hover:underline">
                          {u.partName}
                        </Link>
                      </td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{u.partNo}</td>
                      <td className="py-2 font-medium">{u.quantity}</td>
                      <td className="py-2 text-muted-foreground">{u.note ?? '-'}</td>
                      <td className="py-2 text-muted-foreground">{u.usedByName}</td>
                      {!isDone && (
                        <td className="py-2">
                          <button
                            onClick={() => {
                              if (confirm('사용 취소 시 재고가 복구됩니다. 삭제하시겠습니까?'))
                                removePartMutation.mutate(u.id)
                            }}
                            className="text-xs text-destructive hover:underline"
                          >
                            취소
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 작업 이력 */}
      <Card>
        <CardHeader><CardTitle>작업 이력</CardTitle></CardHeader>
        <CardContent>
          {task.histories.length === 0 ? (
            <p className="text-sm text-muted-foreground">이력이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {task.histories.map((h) => (
                <li
                  key={h.id}
                  className={`border-l-4 pl-4 py-2 ${h.type === 'START' ? 'border-blue-400' : 'border-green-400'}`}
                >
                  <div className="flex items-center gap-2 text-sm mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.type === 'START' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {h.type === 'START' ? '시작' : '완료'}
                    </span>
                    <span className="text-muted-foreground text-xs">by {h.recordedByName}</span>
                    {h.durationMinutes && (
                      <span className="text-muted-foreground text-xs">· {h.durationMinutes}분 소요</span>
                    )}
                    <span className="text-muted-foreground/60 text-xs ml-auto">
                      {new Date(h.recordedAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{h.content}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 작업 시작 모달 */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader><CardTitle>작업 시작</CardTitle></CardHeader>
            <CardContent>
              <textarea
                value={startContent}
                onChange={(e) => setStartContent(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[80px] resize-none py-2"
                placeholder="작업 시작 내용을 입력하세요 *"
              />
            </CardContent>
            <CardFooter className="gap-3">
              <Button onClick={() => startMutation.mutate()} disabled={!startContent.trim() || startMutation.isPending} className="flex-1">시작</Button>
              <Button variant="outline" onClick={() => setShowStartModal(false)} className="flex-1">취소</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* 작업 완료 모달 */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader><CardTitle>작업 완료</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <textarea
                value={completeContent}
                onChange={(e) => setCompleteContent(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[80px] resize-none py-2"
                placeholder="작업 결과 및 소견을 입력하세요 *"
              />
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className={inputCls}
                placeholder="소요 시간 (분, 선택)"
                min={1}
              />
            </CardContent>
            <CardFooter className="gap-3">
              <Button className="bg-green-600 text-white hover:bg-green-700 flex-1" onClick={() => completeMutation.mutate()} disabled={!completeContent.trim() || completeMutation.isPending}>완료</Button>
              <Button variant="outline" onClick={() => setShowCompleteModal(false)} className="flex-1">취소</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* 부품 추가 모달 */}
      {showAddPartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader><CardTitle>부품 추가</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">부품 검색</label>
                <input
                  value={partKeyword}
                  onChange={(e) => { setPartKeyword(e.target.value); setSelectedPartId('') }}
                  className={inputCls}
                  placeholder="부품명 또는 제조사"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">부품 선택 *</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(Number(e.target.value))}
                  className={inputCls}
                >
                  <option value="">부품을 선택하세요</option>
                  {partSearchResult?.content.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.partNo}) — 재고: {p.stockQuantity}
                    </option>
                  ))}
                </select>
                {selectedPart && (
                  <p className={`text-xs mt-1 ${selectedPart.stockStatus === 'OUT' ? 'text-destructive' : selectedPart.stockStatus === 'LOW' ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    현재 재고: {selectedPart.stockQuantity}개
                    {selectedPart.stockStatus === 'LOW' && ' (부족)'}
                    {selectedPart.stockStatus === 'OUT' && ' (소진)'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">수량 *</label>
                <input
                  type="number"
                  min={1}
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">메모</label>
                <input
                  value={partNote}
                  onChange={(e) => setPartNote(e.target.value)}
                  className={inputCls}
                  placeholder="선택 사항"
                />
              </div>
            </CardContent>
            <CardFooter className="gap-3">
              <Button
                onClick={() => addPartMutation.mutate()}
                disabled={!selectedPartId || partQuantity < 1 || addPartMutation.isPending}
                className="flex-1"
              >
                {addPartMutation.isPending ? '추가 중...' : '추가'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowAddPartModal(false); setSelectedPartId(''); setPartKeyword('') }}
                className="flex-1"
              >
                취소
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 라우터에 부품 페이지 3개 추가**

`frontend/src/router/index.tsx` — `MaintenanceDetailPage` import 아래에 추가, 라우터 배열에 3개 경로 추가:
```typescript
import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
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
import PartListPage from '../pages/parts/PartListPage'
import PartFormPage from '../pages/parts/PartFormPage'
import PartDetailPage from '../pages/parts/PartDetailPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/dashboard', element: <Layout><DashboardPage /></Layout> },
  { path: '/equipments', element: <Layout><EquipmentListPage /></Layout> },
  { path: '/equipments/new', element: <Layout><EquipmentFormPage /></Layout> },
  { path: '/equipments/:id', element: <Layout><EquipmentDetailPage /></Layout> },
  { path: '/equipments/:id/edit', element: <Layout><EquipmentFormPage /></Layout> },
  { path: '/inspection-checklists', element: <Layout><InspectionChecklistPage /></Layout> },
  { path: '/inspection-schedules', element: <Layout><InspectionScheduleListPage /></Layout> },
  { path: '/inspection-schedules/new', element: <Layout><InspectionScheduleFormPage /></Layout> },
  { path: '/inspections/:id', element: <Layout><InspectionDetailPage /></Layout> },
  { path: '/faults', element: <Layout><FaultListPage /></Layout> },
  { path: '/faults/new', element: <Layout><FaultCreatePage /></Layout> },
  { path: '/faults/:id', element: <Layout><FaultDetailPage /></Layout> },
  { path: '/maintenance', element: <Layout><MaintenanceListPage /></Layout> },
  { path: '/maintenance/new', element: <Layout><MaintenanceCreatePage /></Layout> },
  { path: '/maintenance/:id', element: <Layout><MaintenanceDetailPage /></Layout> },
  { path: '/parts', element: <Layout><PartListPage /></Layout> },
  { path: '/parts/new', element: <Layout><PartFormPage /></Layout> },
  { path: '/parts/:id', element: <Layout><PartDetailPage /></Layout> },
  { path: '/parts/:id/edit', element: <Layout><PartFormPage /></Layout> },
  { path: '*', element: <NotFoundPage /> },
])

export default router
```

- [ ] **Step 4: Layout.tsx 사이드바에 부품관리 메뉴 추가**

`frontend/src/components/Layout.tsx` — `navItems` 배열에 부품관리 항목 추가:

```typescript
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  AlertTriangle,
  Settings,
  Package,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Factory,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: '대시보드', path: '/dashboard' },
  { icon: Wrench, label: '설비관리', path: '/equipments' },
  { icon: ClipboardList, label: '점검관리', path: '/inspection-schedules' },
  { icon: AlertTriangle, label: '장애관리', path: '/faults' },
  { icon: Settings, label: '유지보수', path: '/maintenance' },
  { icon: Package, label: '부품관리', path: '/parts' },
]
```

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 6: 전체 백엔드 테스트 회귀 확인**

```bash
cd backend && ./gradlew test
```
Expected: BUILD SUCCESSFUL, 모든 테스트 통과

- [ ] **Step 7: 커밋 + PR**

```bash
git add frontend/src/
git commit -m "feat(parts): PartDetailPage + MaintenanceDetailPage 부품섹션 + 라우터 + 사이드바"
git push -u origin feat/parts
```

PR 제목: `feat(parts): WBS 8.0~8.3 부품관리 - CRUD + 재고관리 + 작업연동`

---

## Self-Review

**스펙 커버리지:**

| 요구사항 | Task |
|---|---|
| Part 엔티티 (partNo 자동생성) | Task 1, Task 2 (generatePartNo) |
| PartUsage 엔티티 | Task 1 |
| 재고 차감/복구 도메인 로직 | Task 1 (Part.decreaseStock/increaseStock) |
| QueryDSL 검색 (keyword/location/stockStatus) | Task 1 (PartRepositoryImpl) |
| 부품 CRUD API | Task 2 (PartController) |
| 재고 직접 조정 API (PATCH /stock) | Task 2 |
| 부품 사용 등록 → 재고 차감 | Task 2 (PartUsageService.create) |
| 부품 사용 삭제 → 재고 복구 | Task 2 (PartUsageService.delete) |
| 완료/취소 작업 부품 추가 불가 → 409 | Task 2 (PartUsageService 검증) |
| 재고 부족 → 409 | Task 2 (Part.decreaseStock 예외) |
| 소프트 삭제 (active=false) | Task 2 (PartService.delete) |
| 통합 테스트 (8 cases, TDD) | Task 2 (PartControllerTest) |
| Frontend 타입 + API 클라이언트 | Task 3 |
| PartListPage (검색/필터/재고배지) | Task 4 |
| PartFormPage (등록/수정) | Task 4 |
| PartDetailPage (재고조정 모달 + 사용이력) | Task 5 |
| MaintenanceDetailPage 사용부품 섹션 + 모달 | Task 5 |
| 라우터 4개 경로 등록 | Task 5 |
| 사이드바 부품관리 메뉴 | Task 5 |

**타입 일관성:**
- `partUsageApi.create(maintenanceId, { partId, quantity, note })` → Task 3 정의, Task 5에서 호출 ✓
- `partApi.adjustStock(id, { newQuantity })` → Task 3 정의, Task 5에서 호출 ✓
- `PartUsageResponse.{ id, partId, partName, partNo, maintenanceTaskId, maintenanceTaskNo, quantity, note, usedByName, usedAt }` → Task 2 백엔드 정의, Task 3 프론트 타입 일치 ✓
- `STOCK_STATUS_LABELS` → Task 3 정의, Task 4·5에서 import ✓
- `stockVariant` (`success/orange/destructive`) → Badge 컴포넌트 기존 variants와 일치 ✓
