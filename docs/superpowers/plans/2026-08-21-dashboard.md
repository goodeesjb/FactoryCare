# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /api/dashboard/summary` 단일 API로 KPI·차트·목록 데이터를 집계하고, 프론트엔드에서 기간/설비상태 필터로 실시간 갱신되는 대시보드를 구현한다.

**Architecture:** 백엔드는 기존 4개 도메인 repository에 집계 쿼리 메서드를 추가하고, 새 `dashboard` 도메인(controller + service + dto)에서 조합한다. 프론트엔드는 `api/dashboard.ts` + `DashboardPage.tsx` (전면 교체) 두 파일로 구성된다.

**Tech Stack:** Spring Boot 4.1 + Spring Data JPA, JPQL/Native query, MariaDB, React 19 + TypeScript + react-chartjs-2 (chart.js 4, already installed), TanStack Query v5, Tailwind v4, lucide-react

## Global Constraints

- 백엔드 패키지: `com.factorycare.backend.domain.dashboard`
- 프론트엔드 경로: `frontend/src/`
- 모든 API는 JWT 인증 필수 (`anyRequest().authenticated()`)
- 기존 엔티티/enum 값 그대로 사용 — FaultStatus.REPORTED (not OPEN), FaultStatus.CONFIRMED, FaultStatus.IN_PROGRESS
- 테스트: `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")` 패턴
- 커밋 메시지 본문 한글

---

## File Map

**신규 생성:**
- `backend/.../domain/dashboard/dto/KpiResponse.java`
- `backend/.../domain/dashboard/dto/FaultTrendItem.java`
- `backend/.../domain/dashboard/dto/EquipmentStatusItem.java`
- `backend/.../domain/dashboard/dto/DashboardFaultItem.java`
- `backend/.../domain/dashboard/dto/DashboardMaintenanceItem.java`
- `backend/.../domain/dashboard/dto/DashboardSummaryResponse.java`
- `backend/.../domain/dashboard/service/DashboardService.java`
- `backend/.../domain/dashboard/controller/DashboardController.java`
- `backend/src/test/.../domain/dashboard/DashboardControllerTest.java`
- `frontend/src/api/dashboard.ts`

**수정:**
- `backend/.../domain/equipment/repository/EquipmentRepository.java` — 집계 쿼리 메서드 추가
- `backend/.../domain/fault/repository/FaultRepository.java` — 집계/최근5건 쿼리 추가
- `backend/.../domain/maintenance/repository/MaintenanceRepository.java` — 집계/최근5건 추가
- `backend/.../domain/inspection/repository/InspectionScheduleRepository.java` — 기간별 count 추가
- `frontend/src/pages/DashboardPage.tsx` — 전면 교체

---

### Task 1: Backend DTO Records

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/dto/KpiResponse.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/dto/FaultTrendItem.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/dto/EquipmentStatusItem.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/dto/DashboardFaultItem.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/dto/DashboardMaintenanceItem.java`
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/dto/DashboardSummaryResponse.java`

**Interfaces:**
- Produces: `DashboardSummaryResponse` — Task 3(Service), Task 4(Controller), Task 5(Test) 에서 사용

- [ ] **Step 1: DTO 파일 6개 생성**

`KpiResponse.java`:
```java
package com.factorycare.backend.domain.dashboard.dto;

public record KpiResponse(
    long totalEquipments,
    long normalEquipments,
    long brokenEquipments,
    long pendingMaintenance,
    long unresolvedFaults,
    long scheduledInspections
) {}
```

`FaultTrendItem.java`:
```java
package com.factorycare.backend.domain.dashboard.dto;

public record FaultTrendItem(String month, long count) {}
```

`EquipmentStatusItem.java`:
```java
package com.factorycare.backend.domain.dashboard.dto;

public record EquipmentStatusItem(String status, String label, long count) {}
```

`DashboardFaultItem.java`:
```java
package com.factorycare.backend.domain.dashboard.dto;

public record DashboardFaultItem(
    Long id,
    String title,
    String equipmentName,
    String severity,
    String status,
    String reportedAt
) {}
```

`DashboardMaintenanceItem.java`:
```java
package com.factorycare.backend.domain.dashboard.dto;

public record DashboardMaintenanceItem(
    Long id,
    String title,
    String taskNo,
    String equipmentName,
    String status,
    String scheduledDate
) {}
```

`DashboardSummaryResponse.java`:
```java
package com.factorycare.backend.domain.dashboard.dto;

import java.util.List;

public record DashboardSummaryResponse(
    KpiResponse kpi,
    List<FaultTrendItem> faultTrend,
    List<EquipmentStatusItem> equipmentStatusDistribution,
    List<DashboardFaultItem> recentFaults,
    List<DashboardMaintenanceItem> recentMaintenance
) {}
```

- [ ] **Step 2: 컴파일 확인**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/dashboard/
git commit -m "feat(dashboard): 대시보드 DTO record 클래스 추가"
```

---

### Task 2: Repository 집계 메서드 추가

**Files:**
- Modify: `backend/src/main/java/com/factorycare/backend/domain/equipment/repository/EquipmentRepository.java`
- Modify: `backend/src/main/java/com/factorycare/backend/domain/fault/repository/FaultRepository.java`
- Modify: `backend/src/main/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceRepository.java`
- Modify: `backend/src/main/java/com/factorycare/backend/domain/inspection/repository/InspectionScheduleRepository.java`

**Interfaces:**
- Consumes: 기존 entity/enum classes
- Produces: 집계 메서드들 — Task 3(DashboardService)에서 사용

- [ ] **Step 1: EquipmentRepository에 메서드 추가**

기존 파일에 아래 메서드를 추가한다:

```java
long countByActiveTrue();

long countByStatusAndActiveTrue(EquipmentStatus status);

@Query("SELECT e.status, COUNT(e) FROM Equipment e WHERE e.active = true GROUP BY e.status")
List<Object[]> countGroupByStatus();
```

필요한 import:
```java
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
```

결과 파일:
```java
package com.factorycare.backend.domain.equipment.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EquipmentRepository extends JpaRepository<Equipment, Long>, EquipmentRepositoryCustom {
    boolean existsByEquipmentNo(String equipmentNo);
    Optional<Equipment> findByIdAndActiveTrue(Long id);
    long countByActiveTrue();
    long countByStatusAndActiveTrue(EquipmentStatus status);
    @Query("SELECT e.status, COUNT(e) FROM Equipment e WHERE e.active = true GROUP BY e.status")
    List<Object[]> countGroupByStatus();
}
```

- [ ] **Step 2: FaultRepository에 메서드 추가**

```java
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
```

추가 메서드:
```java
long countByStatusIn(List<FaultStatus> statuses);

@Query(value = "SELECT YEAR(created_at), MONTH(created_at), COUNT(*) " +
               "FROM faults WHERE created_at >= :start " +
               "GROUP BY YEAR(created_at), MONTH(created_at) " +
               "ORDER BY YEAR(created_at), MONTH(created_at)",
       nativeQuery = true)
List<Object[]> countByYearMonthSince(@Param("start") LocalDateTime start);

@Query("SELECT f FROM Fault f JOIN FETCH f.equipment ORDER BY f.createdAt DESC")
List<Fault> findRecentWithEquipment(Pageable pageable);
```

결과 파일:
```java
package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface FaultRepository extends JpaRepository<Fault, Long>, FaultRepositoryCustom {
    long countByStatusIn(List<FaultStatus> statuses);

    @Query(value = "SELECT YEAR(created_at), MONTH(created_at), COUNT(*) " +
                   "FROM faults WHERE created_at >= :start " +
                   "GROUP BY YEAR(created_at), MONTH(created_at) " +
                   "ORDER BY YEAR(created_at), MONTH(created_at)",
           nativeQuery = true)
    List<Object[]> countByYearMonthSince(@Param("start") LocalDateTime start);

    @Query("SELECT f FROM Fault f JOIN FETCH f.equipment ORDER BY f.createdAt DESC")
    List<Fault> findRecentWithEquipment(Pageable pageable);
}
```

- [ ] **Step 3: MaintenanceRepository에 메서드 추가**

```java
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import org.springframework.data.domain.Pageable;
```

추가 메서드:
```java
long countByStatus(MaintenanceStatus status);

@Query("SELECT m FROM MaintenanceTask m JOIN FETCH m.equipment ORDER BY m.scheduledDate ASC")
List<MaintenanceTask> findRecentWithEquipment(Pageable pageable);
```

결과 파일:
```java
package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MaintenanceRepository extends JpaRepository<MaintenanceTask, Long>, MaintenanceRepositoryCustom {
    @Query("SELECT COUNT(m) FROM MaintenanceTask m WHERE m.createdAt >= :start AND m.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    long countByStatus(MaintenanceStatus status);

    @Query("SELECT m FROM MaintenanceTask m JOIN FETCH m.equipment ORDER BY m.scheduledDate ASC")
    List<MaintenanceTask> findRecentWithEquipment(Pageable pageable);
}
```

- [ ] **Step 4: InspectionScheduleRepository에 메서드 추가**

```java
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import java.time.LocalDate;
```

추가 메서드:
```java
long countByScheduledDateBetweenAndStatus(LocalDate start, LocalDate end, InspectionScheduleStatus status);
```

결과 파일:
```java
package com.factorycare.backend.domain.inspection.repository;

import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface InspectionScheduleRepository
    extends JpaRepository<InspectionSchedule, Long>, InspectionScheduleRepositoryCustom {
    long countByScheduledDateBetweenAndStatus(LocalDate start, LocalDate end, InspectionScheduleStatus status);
}
```

- [ ] **Step 5: 컴파일 확인**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/equipment/repository/EquipmentRepository.java
git add backend/src/main/java/com/factorycare/backend/domain/fault/repository/FaultRepository.java
git add backend/src/main/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceRepository.java
git add backend/src/main/java/com/factorycare/backend/domain/inspection/repository/InspectionScheduleRepository.java
git commit -m "feat(dashboard): 대시보드 집계용 repository 메서드 추가"
```

---

### Task 3: DashboardService

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/service/DashboardService.java`

**Interfaces:**
- Consumes: `EquipmentRepository`, `FaultRepository`, `MaintenanceRepository`, `InspectionScheduleRepository`
- Consumes: Task 1 DTOs — `DashboardSummaryResponse`, `KpiResponse`, `FaultTrendItem`, `EquipmentStatusItem`, `DashboardFaultItem`, `DashboardMaintenanceItem`
- Produces: `getSummary(int period, String equipmentStatus): DashboardSummaryResponse` — Task 4(Controller)에서 사용

- [ ] **Step 1: DashboardService 작성**

```java
package com.factorycare.backend.domain.dashboard.service;

import com.factorycare.backend.domain.dashboard.dto.*;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.InspectionScheduleStatus;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final List<FaultStatus> UNRESOLVED_STATUSES =
        List.of(FaultStatus.REPORTED, FaultStatus.CONFIRMED, FaultStatus.IN_PROGRESS);

    private final EquipmentRepository equipmentRepository;
    private final FaultRepository faultRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final InspectionScheduleRepository inspectionScheduleRepository;

    public DashboardService(EquipmentRepository equipmentRepository,
                            FaultRepository faultRepository,
                            MaintenanceRepository maintenanceRepository,
                            InspectionScheduleRepository inspectionScheduleRepository) {
        this.equipmentRepository = equipmentRepository;
        this.faultRepository = faultRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.inspectionScheduleRepository = inspectionScheduleRepository;
    }

    public DashboardSummaryResponse getSummary(int period, String equipmentStatus) {
        return new DashboardSummaryResponse(
            buildKpi(period, equipmentStatus),
            buildFaultTrend(),
            buildEquipmentDistribution(),
            buildRecentFaults(),
            buildRecentMaintenance()
        );
    }

    private KpiResponse buildKpi(int period, String equipmentStatus) {
        long totalEquipments = "ALL".equals(equipmentStatus)
            ? equipmentRepository.countByActiveTrue()
            : equipmentRepository.countByStatusAndActiveTrue(EquipmentStatus.valueOf(equipmentStatus));

        long normalEquipments = equipmentRepository.countByStatusAndActiveTrue(EquipmentStatus.NORMAL);
        long brokenEquipments = equipmentRepository.countByStatusAndActiveTrue(EquipmentStatus.BROKEN);
        long pendingMaintenance = maintenanceRepository.countByStatus(MaintenanceStatus.PENDING);
        long unresolvedFaults = faultRepository.countByStatusIn(UNRESOLVED_STATUSES);

        LocalDate today = LocalDate.now();
        long scheduledInspections = inspectionScheduleRepository
            .countByScheduledDateBetweenAndStatus(today, today.plusDays(period), InspectionScheduleStatus.SCHEDULED);

        return new KpiResponse(totalEquipments, normalEquipments, brokenEquipments,
            pendingMaintenance, unresolvedFaults, scheduledInspections);
    }

    private List<FaultTrendItem> buildFaultTrend() {
        LocalDateTime sixMonthsAgo = YearMonth.now().minusMonths(5)
            .atDay(1).atStartOfDay();
        List<Object[]> rows = faultRepository.countByYearMonthSince(sixMonthsAgo);

        Map<String, Long> trendMap = rows.stream().collect(Collectors.toMap(
            row -> ((Number) row[0]).intValue() + "-" + String.format("%02d", ((Number) row[1]).intValue()),
            row -> ((Number) row[2]).longValue()
        ));

        List<FaultTrendItem> result = new ArrayList<>();
        YearMonth now = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            String key = ym.getYear() + "-" + String.format("%02d", ym.getMonthValue());
            result.add(new FaultTrendItem(ym.getMonthValue() + "월", trendMap.getOrDefault(key, 0L)));
        }
        return result;
    }

    private List<EquipmentStatusItem> buildEquipmentDistribution() {
        List<Object[]> rows = equipmentRepository.countGroupByStatus();
        Map<EquipmentStatus, Long> distMap = rows.stream().collect(Collectors.toMap(
            row -> (EquipmentStatus) row[0],
            row -> (Long) row[1]
        ));

        record StatusMeta(EquipmentStatus status, String label) {}
        List<StatusMeta> order = List.of(
            new StatusMeta(EquipmentStatus.NORMAL, "정상"),
            new StatusMeta(EquipmentStatus.INSPECTION_NEEDED, "점검필요"),
            new StatusMeta(EquipmentStatus.BROKEN, "고장"),
            new StatusMeta(EquipmentStatus.REPAIRING, "수리중"),
            new StatusMeta(EquipmentStatus.DISCARDED, "폐기")
        );

        return order.stream()
            .map(m -> new EquipmentStatusItem(m.status().name(), m.label(), distMap.getOrDefault(m.status(), 0L)))
            .toList();
    }

    private List<DashboardFaultItem> buildRecentFaults() {
        return faultRepository.findRecentWithEquipment(PageRequest.of(0, 5))
            .stream()
            .map(f -> new DashboardFaultItem(
                f.getId(),
                f.getTitle(),
                f.getEquipment().getName(),
                f.getSeverity().name(),
                f.getStatus().name(),
                f.getCreatedAt().toLocalDate().toString()
            ))
            .toList();
    }

    private List<DashboardMaintenanceItem> buildRecentMaintenance() {
        return maintenanceRepository.findRecentWithEquipment(PageRequest.of(0, 5))
            .stream()
            .map(m -> new DashboardMaintenanceItem(
                m.getId(),
                m.getTitle(),
                m.getTaskNo(),
                m.getEquipment().getName(),
                m.getStatus().name(),
                m.getScheduledDate() != null ? m.getScheduledDate().toString() : null
            ))
            .toList();
    }
}
```

- [ ] **Step 2: 컴파일 확인**

Run: `cd backend && ./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/dashboard/service/
git commit -m "feat(dashboard): DashboardService 데이터 집계 로직 구현"
```

---

### Task 4: DashboardController + Integration Test

**Files:**
- Create: `backend/src/main/java/com/factorycare/backend/domain/dashboard/controller/DashboardController.java`
- Create: `backend/src/test/java/com/factorycare/backend/domain/dashboard/DashboardControllerTest.java`

**Interfaces:**
- Consumes: `DashboardService.getSummary(int, String)`
- Produces: `GET /api/dashboard/summary?period=30&equipmentStatus=ALL` → `DashboardSummaryResponse`

- [ ] **Step 1: 테스트 먼저 작성 (TDD)**

```java
package com.factorycare.backend.domain.dashboard;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.entity.EquipmentStatus;
import com.factorycare.backend.domain.equipment.entity.EquipmentType;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.equipment.repository.EquipmentTypeRepository;
import com.factorycare.backend.domain.fault.entity.Fault;
import com.factorycare.backend.domain.fault.entity.FaultSeverity;
import com.factorycare.backend.domain.fault.entity.FaultStatus;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.repository.InspectionScheduleRepository;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.security.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired EquipmentTypeRepository equipmentTypeRepository;
    @Autowired FaultRepository faultRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired InspectionScheduleRepository inspectionScheduleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String workerToken;
    Equipment equipment;

    @BeforeEach
    void setUp() {
        faultRepository.deleteAll();
        maintenanceRepository.deleteAll();
        inspectionScheduleRepository.deleteAll();
        equipmentRepository.deleteAll();
        equipmentTypeRepository.deleteAll();
        userRepository.deleteAll();

        User worker = userRepository.save(User.builder()
            .loginId("worker1").password(passwordEncoder.encode("pw123456"))
            .name("작업자1").role(UserRole.WORKER).build());
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getLoginId(), worker.getRole().name());

        EquipmentType type = equipmentTypeRepository.save(
            EquipmentType.builder().name("설비유형1").build());
        equipment = equipmentRepository.save(Equipment.builder()
            .equipmentNo("EQ-001").name("테스트설비").type(type).build());

        faultRepository.save(Fault.builder()
            .equipment(equipment).title("테스트 장애").severity(FaultSeverity.HIGH)
            .reportedBy(worker).build());
    }

    @Test
    @DisplayName("인증 없이 접근 시 401")
    void unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/dashboard/summary 기본 파라미터로 200 반환")
    void summary_returnsOk() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", workerToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpi.totalEquipments").value(1))
            .andExpect(jsonPath("$.kpi.normalEquipments").value(1))
            .andExpect(jsonPath("$.kpi.unresolvedFaults").value(1))
            .andExpect(jsonPath("$.faultTrend").isArray())
            .andExpect(jsonPath("$.faultTrend.length()").value(6))
            .andExpect(jsonPath("$.equipmentStatusDistribution").isArray())
            .andExpect(jsonPath("$.equipmentStatusDistribution.length()").value(5))
            .andExpect(jsonPath("$.recentFaults[0].title").value("테스트 장애"))
            .andExpect(jsonPath("$.recentFaults[0].equipmentName").value("테스트설비"))
            .andExpect(jsonPath("$.recentMaintenance").isArray());
    }

    @Test
    @DisplayName("equipmentStatus=BROKEN 필터 시 totalEquipments는 고장 수만 반환")
    void summary_withBrokenFilter_filtersTotalCount() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", workerToken)
                .param("equipmentStatus", "BROKEN"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpi.totalEquipments").value(0));
    }

    @Test
    @DisplayName("period=7 파라미터 적용 시 200 반환")
    void summary_withPeriod7_returnsOk() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", workerToken)
                .param("period", "7"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kpi").exists());
    }
}
```

> **참고:** `EquipmentTypeRepository` import는 기존 equipment 도메인 패키지에서 찾는다.
> `Equipment.builder()` 에서 type 필드가 필요 — 기존 EquipmentControllerTest 참고.

- [ ] **Step 2: 테스트 실행 — 컨트롤러 없으므로 404/빌드에러 예상**

Run: `cd backend && ./gradlew test --tests "com.factorycare.backend.domain.dashboard.DashboardControllerTest" 2>&1 | tail -30`
Expected: FAILED (404 or compilation error — DashboardController 없음)

- [ ] **Step 3: DashboardController 작성**

```java
package com.factorycare.backend.domain.dashboard.controller;

import com.factorycare.backend.domain.dashboard.dto.DashboardSummaryResponse;
import com.factorycare.backend.domain.dashboard.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryResponse> getSummary(
            @RequestParam(defaultValue = "30") int period,
            @RequestParam(defaultValue = "ALL") String equipmentStatus) {
        return ResponseEntity.ok(service.getSummary(period, equipmentStatus));
    }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd backend && ./gradlew test --tests "com.factorycare.backend.domain.dashboard.DashboardControllerTest" 2>&1 | tail -30`
Expected: 4개 테스트 모두 PASS

- [ ] **Step 5: 전체 테스트 회귀 확인**

Run: `cd backend && ./gradlew test 2>&1 | tail -20`
Expected: BUILD SUCCESSFUL, no failures

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/com/factorycare/backend/domain/dashboard/controller/
git add backend/src/test/java/com/factorycare/backend/domain/dashboard/
git commit -m "feat(dashboard): DashboardController 구현 및 통합 테스트 추가"
```

---

### Task 5: Frontend API 타입 + dashboardApi

**Files:**
- Create: `frontend/src/api/dashboard.ts`

**Interfaces:**
- Produces: `DashboardSummaryResponse` 타입, `dashboardApi.getSummary(period, equipmentStatus)` — Task 6(DashboardPage)에서 사용

- [ ] **Step 1: `frontend/src/api/dashboard.ts` 작성**

```typescript
import axiosInstance from './axiosInstance'

export interface KpiResponse {
  totalEquipments: number
  normalEquipments: number
  brokenEquipments: number
  pendingMaintenance: number
  unresolvedFaults: number
  scheduledInspections: number
}

export interface FaultTrendItem {
  month: string
  count: number
}

export interface EquipmentStatusItem {
  status: string
  label: string
  count: number
}

export interface DashboardFaultItem {
  id: number
  title: string
  equipmentName: string
  severity: string
  status: string
  reportedAt: string
}

export interface DashboardMaintenanceItem {
  id: number
  title: string
  taskNo: string
  equipmentName: string
  status: string
  scheduledDate: string | null
}

export interface DashboardSummaryResponse {
  kpi: KpiResponse
  faultTrend: FaultTrendItem[]
  equipmentStatusDistribution: EquipmentStatusItem[]
  recentFaults: DashboardFaultItem[]
  recentMaintenance: DashboardMaintenanceItem[]
}

export const dashboardApi = {
  getSummary: (period: number, equipmentStatus: string) =>
    axiosInstance
      .get<DashboardSummaryResponse>('/dashboard/summary', {
        params: { period, equipmentStatus },
      })
      .then((r) => r.data),
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/api/dashboard.ts
git commit -m "feat(dashboard): 프론트엔드 dashboard API 클라이언트 추가"
```

---

### Task 6: DashboardPage.tsx 전면 교체

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `dashboardApi.getSummary` (Task 5), `DashboardSummaryResponse` 타입들
- Consumes: `chart.js`, `react-chartjs-2` (이미 설치됨)

- [ ] **Step 1: DashboardPage.tsx 작성**

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  AlertOctagon,
  CalendarCheck,
} from 'lucide-react'
import { dashboardApi } from '../api/dashboard'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const PERIOD_OPTIONS = [
  { label: '7일', value: 7 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
] as const

const EQUIPMENT_STATUS_OPTIONS = [
  { label: '전체', value: 'ALL' },
  { label: '정상', value: 'NORMAL' },
  { label: '점검필요', value: 'INSPECTION_NEEDED' },
  { label: '고장', value: 'BROKEN' },
  { label: '수리중', value: 'REPAIRING' },
  { label: '폐기', value: 'DISCARDED' },
]

const STATUS_COLORS: Record<string, string> = {
  NORMAL: '#22c55e',
  INSPECTION_NEEDED: '#eab308',
  BROKEN: '#ef4444',
  REPAIRING: '#3b82f6',
  DISCARDED: '#6b7280',
}

const SEVERITY_LABEL: Record<string, string> = {
  LOW: '낮음', MEDIUM: '보통', HIGH: '높음', CRITICAL: '긴급',
}
const SEVERITY_CLS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

const MAINT_STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', IN_PROGRESS: '진행중', COMPLETED: '완료', CANCELLED: '취소',
}
const MAINT_STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const FAULT_STATUS_LABEL: Record<string, string> = {
  REPORTED: '접수', CONFIRMED: '확인', IN_PROGRESS: '처리중', RESOLVED: '해결', CLOSED: '종료',
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
          <div className="h-3 w-20 bg-muted rounded mb-4" />
          <div className="h-8 w-12 bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [equipmentStatus, setEquipmentStatus] = useState('ALL')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', period, equipmentStatus],
    queryFn: () => dashboardApi.getSummary(period, equipmentStatus),
  })

  const kpiCards = data
    ? [
        { label: '전체 설비', value: data.kpi.totalEquipments, Icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', link: '/equipments' },
        { label: '정상 설비', value: data.kpi.normalEquipments, Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', link: '/equipments' },
        { label: '고장 설비', value: data.kpi.brokenEquipments, Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', link: '/faults' },
        { label: '대기 정비', value: data.kpi.pendingMaintenance, Icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50', link: '/maintenance' },
        { label: '미해결 장애', value: data.kpi.unresolvedFaults, Icon: AlertOctagon, color: 'text-rose-600', bg: 'bg-rose-50', link: '/faults' },
        { label: '예정 점검', value: data.kpi.scheduledInspections, Icon: CalendarCheck, color: 'text-violet-600', bg: 'bg-violet-50', link: '/inspection-schedules' },
      ]
    : []

  const faultTrendData = data
    ? {
        labels: data.faultTrend.map((i) => i.month),
        datasets: [{
          label: '장애 건수',
          data: data.faultTrend.map((i) => i.count),
          fill: true,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          pointRadius: 4,
        }],
      }
    : null

  const equipDistData = data
    ? {
        labels: data.equipmentStatusDistribution.map((i) => i.label),
        datasets: [{
          data: data.equipmentStatusDistribution.map((i) => i.count),
          backgroundColor: data.equipmentStatusDistribution.map((i) => STATUS_COLORS[i.status] ?? '#94a3b8'),
          borderWidth: 0,
        }],
      }
    : null

  const selectCls = "h-8 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring transition-colors"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">설비 관제 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-1">실시간 설비 현황을 확인하세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value) as 7 | 30 | 90)}
            className={selectCls}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={equipmentStatus}
            onChange={(e) => setEquipmentStatus(e.target.value)}
            className={selectCls}
          >
            {EQUIPMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          데이터를 불러오지 못했습니다. 새로고침해주세요.
        </div>
      )}

      {isLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpiCards.map(({ label, value, Icon, color, bg, link }) => (
            <Link
              key={label}
              to={link}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground">{value}</div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">월별 장애 추이</h2>
              {faultTrendData && (
                <Line
                  data={faultTrendData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    },
                  }}
                />
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">설비 상태 분포</h2>
              {equipDistData && (
                <div className="flex justify-center">
                  <div className="w-64">
                    <Doughnut
                      data={equipDistData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">최근 장애</h2>
                <Link to="/faults" className="text-xs text-primary hover:underline">전체보기</Link>
              </div>
              <div className="divide-y divide-border">
                {data.recentFaults.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">장애 내역이 없습니다.</p>
                ) : (
                  data.recentFaults.map((f) => (
                    <Link
                      key={f.id}
                      to={`/faults/${f.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.equipmentName} · {FAULT_STATUS_LABEL[f.status] ?? f.status} · {f.reportedAt}
                        </p>
                      </div>
                      <span className={`ml-3 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_CLS[f.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SEVERITY_LABEL[f.severity] ?? f.severity}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">최근 정비작업</h2>
                <Link to="/maintenance" className="text-xs text-primary hover:underline">전체보기</Link>
              </div>
              <div className="divide-y divide-border">
                {data.recentMaintenance.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">정비 내역이 없습니다.</p>
                ) : (
                  data.recentMaintenance.map((m) => (
                    <Link
                      key={m.id}
                      to={`/maintenance/${m.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {m.taskNo} · {m.scheduledDate ?? '-'}
                        </p>
                      </div>
                      <span className={`ml-3 shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${MAINT_STATUS_CLS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {MAINT_STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): DashboardPage 전면 교체 - KPI·차트·필터 구현"
```

---

## Self-Review

### Spec Coverage

| 요구사항 | Task |
|---|---|
| GET /api/dashboard/summary endpoint | Task 4 |
| period, equipmentStatus QueryParam | Task 4 |
| KPI 6개 (totalEquipments, normalEquipments, brokenEquipments, pendingMaintenance, unresolvedFaults, scheduledInspections) | Task 1, 3 |
| faultTrend (최근 6개월) | Task 3 |
| equipmentStatusDistribution (5개 상태) | Task 3 |
| recentFaults (최신 5건) | Task 3 |
| recentMaintenance (최신 5건, scheduledDate ASC) | Task 3 |
| 인증된 사용자만 접근 | SecurityConfig 기존 설정으로 커버 |
| KPI 카드 6개 + 아이콘 + 링크 | Task 6 |
| AreaChart (Line + fill) 월별 장애 추이 | Task 6 |
| Doughnut 설비 상태 분포 | Task 6 |
| 기간 필터 (7/30/90일) | Task 6 |
| 설비상태 필터 | Task 6 |
| 로딩 skeleton | Task 6 |
| 에러 메시지 | Task 6 |
| 최근 장애/정비 목록 | Task 6 |

### Placeholder Scan

없음 — 모든 step에 실제 코드 포함.

### Type Consistency

- `DashboardSummaryResponse` record (Java) ↔ `DashboardSummaryResponse` interface (TypeScript) — field명 일치 확인.
- `KpiResponse` fields: `totalEquipments`, `normalEquipments`, `brokenEquipments`, `pendingMaintenance`, `unresolvedFaults`, `scheduledInspections` — Java record ↔ TS interface ↔ DashboardPage 사용 위치 모두 일치.
- `FaultStatus.REPORTED` — spec의 "OPEN" 대신 실제 enum 값 사용. Service의 `UNRESOLVED_STATUSES`, Test의 기대값, DashboardPage의 `FAULT_STATUS_LABEL` 모두 실제 enum 기준.
- `findRecentWithEquipment(Pageable)` — FaultRepository와 MaintenanceRepository 양쪽에 동일 시그니처, Service에서 `PageRequest.of(0, 5)` 로 호출.
