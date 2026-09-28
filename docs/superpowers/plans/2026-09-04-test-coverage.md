# FactoryCare 전체 테스트 커버리지 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Service 단위 테스트(Mockito), Repository 검색 테스트(@DataJpaTest), 통합 플로우 테스트(@SpringBootTest) 추가로 전체 비즈니스 로직 커버리지 확보

**Architecture:** 3계층 테스트 전략. (1) Service 계층 — Mockito로 Repository 모킹, 비즈니스 로직/상태머신/예외 검증. (2) Repository 계층 — @DataJpaTest + QueryDSL 검색 조건 조합 검증. (3) 통합 플로우 — @SpringBootTest MockMvc로 도메인 간 연계 시나리오 검증.

**Tech Stack:** Spring Boot 4.1, JUnit 5, Mockito, AssertJ, @DataJpaTest, @SpringBootTest, QueryDSL

## Global Constraints

- 테스트 프로필: `@ActiveProfiles("test")` 필수
- Repository 테스트: `@DataJpaTest + @Import(JpaConfig.class)` 패턴 (기존 EquipmentRepositoryTest 동일)
- Service 단위 테스트: `@ExtendWith(MockitoExtension.class)` 사용
- 통합 테스트: `@SpringBootTest + @AutoConfigureMockMvc` 패턴 (기존 MaintenanceControllerTest 동일)
- 패키지: `com.factorycare.backend.domain.<domain>` 하위
- 빌드 명령: `cd C:\Users\editi\IdeaProjects\FactoryCare\backend && .\gradlew test`
- 기존 테스트 파일 경로: `backend/src/test/java/com/factorycare/backend/`

---

## 파일 맵

| 파일 (신규 생성) | 역할 |
|---|---|
| `...fault/service/FaultServiceTest.java` | FaultService 단위 테스트 |
| `...maintenance/service/MaintenanceServiceTest.java` | MaintenanceService 단위 테스트 |
| `...part/service/PartServiceTest.java` | PartService 단위 테스트 |
| `...part/service/PartUsageServiceTest.java` | PartUsageService 단위 테스트 |
| `...inspection/service/InspectionServiceTest.java` | InspectionService 단위 테스트 |
| `...fault/repository/FaultRepositoryTest.java` | FaultRepository QueryDSL 테스트 |
| `...maintenance/repository/MaintenanceRepositoryTest.java` | MaintenanceRepository QueryDSL 테스트 |
| `...part/repository/PartRepositoryTest.java` | PartRepository QueryDSL 테스트 |
| `...part/MaintenancePartFlowTest.java` | 유지보수-부품 통합 플로우 테스트 |

---

### Task 1: FaultService 단위 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/fault/service/FaultServiceTest.java`

**Interfaces:**
- 테스트 대상: `FaultService` (FaultRepository, EquipmentRepository, UserRepository 의존)
- 테스트 메서드: `create()`, `createFromInspectionResult()`, `changeStatus()`, `assign()`

- [ ] **Step 1: FaultServiceTest 파일 작성**

```java
package com.factorycare.backend.domain.fault.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.dto.FaultCreateRequest;
import com.factorycare.backend.domain.fault.dto.FaultResponse;
import com.factorycare.backend.domain.fault.dto.FaultStatusChangeRequest;
import com.factorycare.backend.domain.fault.dto.FaultAssignRequest;
import com.factorycare.backend.domain.fault.entity.*;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.inspection.entity.InspectionResult;
import com.factorycare.backend.domain.inspection.entity.InspectionSchedule;
import com.factorycare.backend.domain.inspection.entity.Inspection;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class FaultServiceTest {

    @InjectMocks FaultService faultService;
    @Mock FaultRepository faultRepository;
    @Mock EquipmentRepository equipmentRepository;
    @Mock UserRepository userRepository;

    Equipment equipment;
    User reporter;

    @BeforeEach
    void setUp() {
        equipment = mock(Equipment.class);
        given(equipment.getId()).willReturn(1L);
        given(equipment.getName()).willReturn("컨베이어");

        reporter = mock(User.class);
        given(reporter.getId()).willReturn(2L);
        given(reporter.getName()).willReturn("작업자");
    }

    @Test
    @DisplayName("장애 생성 성공 — title·severity 올바르게 저장")
    void create_success() {
        FaultCreateRequest req = new FaultCreateRequest(1L, "모터 이상", "소음 발생", FaultSeverity.HIGH);
        given(equipmentRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(equipment));
        given(userRepository.findById(2L)).willReturn(Optional.of(reporter));
        given(faultRepository.save(any(Fault.class))).willAnswer(inv -> inv.getArgument(0));

        FaultResponse resp = faultService.create(req, 2L);

        assertThat(resp.title()).isEqualTo("모터 이상");
        assertThat(resp.severity()).isEqualTo(FaultSeverity.HIGH);
        assertThat(resp.status()).isEqualTo(FaultStatus.REPORTED);
        verify(faultRepository).save(argThat(f -> "모터 이상".equals(f.getTitle())));
    }

    @Test
    @DisplayName("존재하지 않는 설비로 장애 생성 → IllegalArgumentException")
    void create_equipmentNotFound_throws() {
        FaultCreateRequest req = new FaultCreateRequest(999L, "테스트", null, FaultSeverity.LOW);
        given(equipmentRepository.findByIdAndActiveTrue(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> faultService.create(req, 2L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("설비를 찾을 수 없습니다");
    }

    @Test
    @DisplayName("점검이상으로 자동 장애 생성 — title에 '[점검이상]' 접두사")
    void createFromInspectionResult_titlePrefix() {
        // InspectionResult mock 구성
        InspectionResult result = mock(InspectionResult.class);
        Inspection inspection = mock(Inspection.class);
        InspectionSchedule schedule = mock(InspectionSchedule.class);
        given(result.getItemName()).willReturn("오일 누유");
        given(result.getNote()).willReturn("심각한 누유");
        given(result.getInspection()).willReturn(inspection);
        given(inspection.getSchedule()).willReturn(schedule);
        given(schedule.getEquipment()).willReturn(equipment);
        given(faultRepository.save(any(Fault.class))).willAnswer(inv -> inv.getArgument(0));

        FaultResponse resp = faultService.createFromInspectionResult(result, reporter);

        assertThat(resp.title()).startsWith("[점검이상]");
        assertThat(resp.title()).contains("오일 누유");
        assertThat(resp.severity()).isEqualTo(FaultSeverity.MEDIUM);
    }

    @Test
    @DisplayName("장애 상태 변경 — REPORTED → CONFIRMED 성공")
    void changeStatus_reportedToConfirmed_success() {
        Fault fault = Fault.builder()
            .equipment(equipment).title("테스트").severity(FaultSeverity.MEDIUM)
            .reportedBy(reporter).build();
        given(faultRepository.findById(1L)).willReturn(Optional.of(fault));
        given(userRepository.findById(2L)).willReturn(Optional.of(reporter));

        FaultStatusChangeRequest req = new FaultStatusChangeRequest(FaultStatus.CONFIRMED, "확인됨");
        FaultResponse resp = faultService.changeStatus(1L, req, 2L);

        assertThat(resp.status()).isEqualTo(FaultStatus.CONFIRMED);
    }

    @Test
    @DisplayName("유효하지 않은 상태 전이 — REPORTED → RESOLVED 시도 → IllegalStateException")
    void changeStatus_invalidTransition_throws() {
        Fault fault = Fault.builder()
            .equipment(equipment).title("테스트").severity(FaultSeverity.MEDIUM)
            .reportedBy(reporter).build();
        given(faultRepository.findById(1L)).willReturn(Optional.of(fault));
        given(userRepository.findById(2L)).willReturn(Optional.of(reporter));

        FaultStatusChangeRequest req = new FaultStatusChangeRequest(FaultStatus.RESOLVED, "바로 해결");

        assertThatThrownBy(() -> faultService.changeStatus(1L, req, 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("상태 전이 불가");
    }

    @Test
    @DisplayName("담당자 배정 성공")
    void assign_updatesAssignee() {
        Fault fault = Fault.builder()
            .equipment(equipment).title("테스트").severity(FaultSeverity.LOW)
            .reportedBy(reporter).build();
        User assignee = mock(User.class);
        given(assignee.getId()).willReturn(3L);
        given(assignee.getName()).willReturn("담당자");
        given(faultRepository.findById(1L)).willReturn(Optional.of(fault));
        given(userRepository.findById(3L)).willReturn(Optional.of(assignee));

        FaultResponse resp = faultService.assign(1L, new FaultAssignRequest(3L));

        assertThat(resp.assignedToName()).isEqualTo("담당자");
    }
}
```

- [ ] **Step 2: 테스트 실행 확인**

```
cd C:\Users\editi\IdeaProjects\FactoryCare\backend
.\gradlew test --tests "com.factorycare.backend.domain.fault.service.FaultServiceTest"
```

Expected: `BUILD SUCCESSFUL`, 6개 테스트 PASS

- [ ] **Step 3: 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/fault/service/FaultServiceTest.java
git commit -m "test(fault): FaultService 단위 테스트 추가 — 생성/상태전이/담당자배정"
```

---

### Task 2: MaintenanceService 단위 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/maintenance/service/MaintenanceServiceTest.java`

**Interfaces:**
- 테스트 대상: `MaintenanceService` (MaintenanceRepository, EquipmentRepository, UserRepository, FaultRepository 의존)
- 핵심 상태머신: PENDING → IN_PROGRESS (start), IN_PROGRESS → COMPLETED (complete), non-COMPLETED/CANCELLED → CANCELLED (cancel)

- [ ] **Step 1: MaintenanceServiceTest 파일 작성**

```java
package com.factorycare.backend.domain.maintenance.service;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.repository.FaultRepository;
import com.factorycare.backend.domain.maintenance.dto.*;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @InjectMocks MaintenanceService maintenanceService;
    @Mock MaintenanceRepository maintenanceRepository;
    @Mock EquipmentRepository equipmentRepository;
    @Mock UserRepository userRepository;
    @Mock FaultRepository faultRepository;

    Equipment equipment;
    User creator;
    MaintenanceTask pendingTask;

    @BeforeEach
    void setUp() {
        equipment = mock(Equipment.class);
        given(equipment.getId()).willReturn(1L);
        given(equipment.getName()).willReturn("컨베이어");

        creator = mock(User.class);
        given(creator.getId()).willReturn(2L);
        given(creator.getName()).willReturn("매니저");

        pendingTask = MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment)
            .title("모터 수리").taskType(MaintenanceType.REPAIR)
            .createdBy(creator).build();
    }

    @Test
    @DisplayName("작업 생성 — taskNo MT-YYYY-NNN 형식")
    void create_taskNoFormat() {
        MaintenanceCreateRequest req = new MaintenanceCreateRequest(
            1L, null, "모터 수리", null, MaintenanceType.REPAIR, null, null, null);
        given(equipmentRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(equipment));
        given(userRepository.findById(2L)).willReturn(Optional.of(creator));
        given(maintenanceRepository.countByCreatedAtBetween(any(), any())).willReturn(0L);
        given(maintenanceRepository.save(any(MaintenanceTask.class))).willAnswer(inv -> inv.getArgument(0));

        MaintenanceResponse resp = maintenanceService.create(req, 2L);

        assertThat(resp.taskNo()).startsWith("MT-");
        assertThat(resp.status()).isEqualTo(MaintenanceStatus.PENDING);
        assertThat(resp.priority()).isEqualTo(MaintenancePriority.MEDIUM);
    }

    @Test
    @DisplayName("PENDING → start → IN_PROGRESS + START 이력 1건")
    void start_fromPending_success() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));
        given(userRepository.findById(2L)).willReturn(Optional.of(creator));

        MaintenanceStartRequest req = new MaintenanceStartRequest("작업 시작");
        MaintenanceResponse resp = maintenanceService.start(1L, req, 2L);

        assertThat(resp.status()).isEqualTo(MaintenanceStatus.IN_PROGRESS);
        assertThat(resp.histories()).hasSize(1);
        assertThat(resp.histories().get(0).type()).isEqualTo(MaintenanceHistoryType.START);
    }

    @Test
    @DisplayName("IN_PROGRESS가 아닌 상태에서 start 시도 → IllegalStateException")
    void start_fromNonPending_throws() {
        // start() 를 한 번 호출해서 IN_PROGRESS 상태로 만든 후 다시 start
        pendingTask.start();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.start(1L, new MaintenanceStartRequest("재시작"), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("PENDING 상태에서만 시작");
    }

    @Test
    @DisplayName("IN_PROGRESS → complete → COMPLETED + COMPLETE 이력 1건 + completedAt")
    void complete_fromInProgress_success() {
        pendingTask.start();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));
        given(userRepository.findById(2L)).willReturn(Optional.of(creator));

        MaintenanceCompleteRequest req = new MaintenanceCompleteRequest("수리 완료", 90);
        MaintenanceResponse resp = maintenanceService.complete(1L, req, 2L);

        assertThat(resp.status()).isEqualTo(MaintenanceStatus.COMPLETED);
        assertThat(resp.completedAt()).isNotNull();
        assertThat(resp.histories()).hasSize(2); // START + COMPLETE
        assertThat(resp.histories().get(1).type()).isEqualTo(MaintenanceHistoryType.COMPLETE);
        assertThat(resp.histories().get(1).durationMinutes()).isEqualTo(90);
    }

    @Test
    @DisplayName("PENDING 상태에서 complete 직접 시도 → IllegalStateException")
    void complete_fromPending_throws() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.complete(1L, new MaintenanceCompleteRequest("완료", 10), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("IN_PROGRESS 상태에서만 완료");
    }

    @Test
    @DisplayName("IN_PROGRESS → cancel → CANCELLED")
    void cancel_fromInProgress_success() {
        pendingTask.start();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        MaintenanceResponse resp = maintenanceService.cancel(1L);

        assertThat(resp.status()).isEqualTo(MaintenanceStatus.CANCELLED);
    }

    @Test
    @DisplayName("COMPLETED 작업 취소 시도 → IllegalStateException")
    void cancel_fromCompleted_throws() {
        pendingTask.start();
        pendingTask.complete();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.cancel(1L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("완료된 작업은 취소할 수 없습니다");
    }

    @Test
    @DisplayName("PENDING 작업 삭제 성공")
    void delete_pending_success() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatNoException().isThrownBy(() -> maintenanceService.delete(1L));
        verify(maintenanceRepository).delete(pendingTask);
    }

    @Test
    @DisplayName("COMPLETED 작업 삭제 시도 → IllegalStateException")
    void delete_completed_throws() {
        pendingTask.start();
        pendingTask.complete();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(pendingTask));

        assertThatThrownBy(() -> maintenanceService.delete(1L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("완료된 작업은 삭제할 수 없습니다");
        verify(maintenanceRepository, never()).delete(any());
    }
}
```

- [ ] **Step 2: 테스트 실행 확인**

```
.\gradlew test --tests "com.factorycare.backend.domain.maintenance.service.MaintenanceServiceTest"
```

Expected: `BUILD SUCCESSFUL`, 8개 테스트 PASS

- [ ] **Step 3: 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/maintenance/service/MaintenanceServiceTest.java
git commit -m "test(maintenance): MaintenanceService 단위 테스트 추가 — 상태머신/생성/삭제"
```

---

### Task 3: PartService + PartUsageService 단위 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/part/service/PartServiceTest.java`
- Create: `backend/src/test/java/com/factorycare/backend/domain/part/service/PartUsageServiceTest.java`

**Interfaces:**
- PartService: create (partNo 자동생성), adjustStock (음수 불가), delete (소프트삭제)
- PartUsageService: create (재고 감소, COMPLETED 작업 차단), delete (재고 복원, 접근제어)

- [ ] **Step 1: PartServiceTest 파일 작성**

```java
package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.part.dto.*;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.repository.PartRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class PartServiceTest {

    @InjectMocks PartService partService;
    @Mock PartRepository partRepository;

    private Part buildPart(int stock, int minimum) {
        return Part.builder()
            .partNo("PT-2026-001").name("베어링A").manufacturer("한국부품")
            .stockQuantity(stock).minimumStock(minimum).build();
    }

    @Test
    @DisplayName("부품 생성 — partNo PT-YYYY-NNN 형식")
    void create_partNoFormat() {
        PartCreateRequest req = new PartCreateRequest("베어링A", "한국부품", 100, 10, "A창고", null);
        given(partRepository.countByCreatedAtBetween(any(), any())).willReturn(0L);
        given(partRepository.save(any(Part.class))).willAnswer(inv -> inv.getArgument(0));

        PartResponse resp = partService.create(req);

        assertThat(resp.partNo()).matches("PT-\\d{4}-\\d{3}");
        assertThat(resp.name()).isEqualTo("베어링A");
    }

    @Test
    @DisplayName("재고 조정 — 새 수량으로 변경")
    void adjustStock_success() {
        Part part = buildPart(50, 10);
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));

        PartResponse resp = partService.adjustStock(1L, new PartStockAdjustRequest(30));

        assertThat(resp.stockQuantity()).isEqualTo(30);
    }

    @Test
    @DisplayName("재고 조정 — 음수 입력 → IllegalArgumentException")
    void adjustStock_negative_throws() {
        Part part = buildPart(50, 10);
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));

        assertThatThrownBy(() -> partService.adjustStock(1L, new PartStockAdjustRequest(-1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("0 이상");
    }

    @Test
    @DisplayName("부품 삭제 — active=false (소프트삭제)")
    void delete_softDelete() {
        Part part = buildPart(10, 5);
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));

        partService.delete(1L);

        assertThat(part.isActive()).isFalse();
        verify(partRepository, never()).delete(any());
    }

    @Test
    @DisplayName("삭제된 부품 조회 → IllegalArgumentException")
    void findById_softDeleted_throws() {
        given(partRepository.findByIdAndActiveTrue(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> partService.findById(999L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("부품을 찾을 수 없습니다");
    }
}
```

- [ ] **Step 2: PartUsageServiceTest 파일 작성**

```java
package com.factorycare.backend.domain.part.service;

import com.factorycare.backend.domain.maintenance.entity.MaintenanceStatus;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceTask;
import com.factorycare.backend.domain.maintenance.entity.MaintenanceType;
import com.factorycare.backend.domain.maintenance.repository.MaintenanceRepository;
import com.factorycare.backend.domain.part.dto.PartUsageCreateRequest;
import com.factorycare.backend.domain.part.dto.PartUsageResponse;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.PartUsage;
import com.factorycare.backend.domain.part.repository.PartRepository;
import com.factorycare.backend.domain.part.repository.PartUsageRepository;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class PartUsageServiceTest {

    @InjectMocks PartUsageService partUsageService;
    @Mock PartUsageRepository partUsageRepository;
    @Mock PartRepository partRepository;
    @Mock MaintenanceRepository maintenanceRepository;
    @Mock UserRepository userRepository;

    MaintenanceTask inProgressTask;
    Part part;
    User worker;

    @BeforeEach
    void setUp() {
        Equipment eq = mock(Equipment.class);
        given(eq.getId()).willReturn(1L);
        given(eq.getName()).willReturn("컨베이어");

        User creator = mock(User.class);
        given(creator.getId()).willReturn(1L);

        inProgressTask = MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(eq)
            .title("모터 수리").taskType(MaintenanceType.REPAIR)
            .createdBy(creator).build();
        inProgressTask.start();

        part = Part.builder()
            .partNo("PT-2026-001").name("베어링A").manufacturer("한국부품")
            .stockQuantity(20).minimumStock(5).build();

        worker = mock(User.class);
        given(worker.getId()).willReturn(2L);
        given(worker.getName()).willReturn("작업자");
    }

    @Test
    @DisplayName("부품 사용 등록 — 재고 감소")
    void create_success_stockDecreases() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(inProgressTask));
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));
        given(userRepository.findById(2L)).willReturn(Optional.of(worker));
        given(partUsageRepository.save(any(PartUsage.class))).willAnswer(inv -> inv.getArgument(0));

        partUsageService.create(1L, new PartUsageCreateRequest(1L, 3, "교체용"), 2L);

        assertThat(part.getStockQuantity()).isEqualTo(17); // 20 - 3
    }

    @Test
    @DisplayName("COMPLETED 작업에 부품 추가 → IllegalStateException")
    void create_completedTask_throws() {
        inProgressTask.complete();
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(inProgressTask));

        assertThatThrownBy(() ->
            partUsageService.create(1L, new PartUsageCreateRequest(1L, 1, null), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("완료 또는 취소된 작업");
    }

    @Test
    @DisplayName("재고 부족 시 부품 사용 등록 → IllegalStateException")
    void create_insufficientStock_throws() {
        given(maintenanceRepository.findById(1L)).willReturn(Optional.of(inProgressTask));
        given(partRepository.findByIdAndActiveTrue(1L)).willReturn(Optional.of(part));
        given(userRepository.findById(2L)).willReturn(Optional.of(worker));

        assertThatThrownBy(() ->
            partUsageService.create(1L, new PartUsageCreateRequest(1L, 100, null), 2L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("재고가 부족합니다");
    }

    @Test
    @DisplayName("부품 사용 삭제 — 재고 복원")
    void delete_success_stockRestored() {
        PartUsage usage = mock(PartUsage.class);
        given(usage.getMaintenanceTask()).willReturn(inProgressTask);
        given(usage.getPart()).willReturn(part);
        given(usage.getQuantity()).willReturn(5);
        given(usage.getUsedBy()).willReturn(worker);
        given(partUsageRepository.findById(1L)).willReturn(Optional.of(usage));

        // 본인이 등록한 이력 삭제
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("worker", null,
                List.of(new SimpleGrantedAuthority("ROLE_WORKER"))));

        partUsageService.delete(1L, 1L, 2L);

        assertThat(part.getStockQuantity()).isEqualTo(25); // 20 + 5
        verify(partUsageRepository).delete(usage);

        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("다른 사람 이력을 WORKER 권한으로 삭제 시도 → AccessDeniedException")
    void delete_nonCreatorWorker_throws() {
        User otherUser = mock(User.class);
        given(otherUser.getId()).willReturn(99L);

        PartUsage usage = mock(PartUsage.class);
        given(usage.getMaintenanceTask()).willReturn(inProgressTask);
        given(usage.getUsedBy()).willReturn(otherUser); // 다른 사람이 등록
        given(partUsageRepository.findById(1L)).willReturn(Optional.of(usage));

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("worker", null,
                List.of(new SimpleGrantedAuthority("ROLE_WORKER"))));

        assertThatThrownBy(() -> partUsageService.delete(1L, 1L, 2L)) // callerId=2L, creator=99L
            .isInstanceOf(AccessDeniedException.class);

        SecurityContextHolder.clearContext();
    }
}
```

- [ ] **Step 3: 테스트 실행 확인**

```
.\gradlew test --tests "com.factorycare.backend.domain.part.service.*"
```

Expected: `BUILD SUCCESSFUL`, 9개 테스트 PASS

- [ ] **Step 4: 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/part/service/
git commit -m "test(part): PartService/PartUsageService 단위 테스트 추가 — 재고관리/접근제어"
```

---

### Task 4: InspectionService 단위 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/inspection/service/InspectionServiceTest.java`

**Interfaces:**
- 테스트 대상: `InspectionService.complete()` — FAIL 결과 → `faultService.createFromInspectionResult()` 호출 여부
- FaultService는 @Mock으로 주입 (실제 호출 안함)

- [ ] **Step 1: InspectionServiceTest 파일 작성**

```java
package com.factorycare.backend.domain.inspection.service;

import com.factorycare.backend.domain.fault.service.FaultService;
import com.factorycare.backend.domain.inspection.dto.InspectionCompleteRequest;
import com.factorycare.backend.domain.inspection.dto.InspectionResultRequest;
import com.factorycare.backend.domain.inspection.entity.*;
import com.factorycare.backend.domain.inspection.repository.*;
import com.factorycare.backend.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class InspectionServiceTest {

    @InjectMocks InspectionService inspectionService;
    @Mock InspectionRepository inspectionRepository;
    @Mock InspectionResultRepository resultRepository;
    @Mock InspectionChecklistItemRepository checklistItemRepository;
    @Mock InspectionScheduleRepository scheduleRepository;
    @Mock FaultService faultService;

    Inspection inspection;
    InspectionSchedule schedule;
    User inspector;
    InspectionChecklistItem item1, item2;

    @BeforeEach
    void setUp() {
        inspector = mock(User.class);
        given(inspector.getId()).willReturn(1L);

        schedule = mock(InspectionSchedule.class);

        inspection = Inspection.builder().schedule(schedule).inspector(inspector).build();

        item1 = mock(InspectionChecklistItem.class);
        given(item1.getId()).willReturn(1L);
        given(item1.getItemName()).willReturn("모터 온도");

        item2 = mock(InspectionChecklistItem.class);
        given(item2.getId()).willReturn(2L);
        given(item2.getItemName()).willReturn("오일 누유");

        given(inspectionRepository.findById(1L)).willReturn(Optional.of(inspection));
        given(resultRepository.saveAll(anyList())).willAnswer(inv -> inv.getArgument(0));
        given(checklistItemRepository.findById(1L)).willReturn(Optional.of(item1));
        given(checklistItemRepository.findById(2L)).willReturn(Optional.of(item2));
    }

    @Test
    @DisplayName("FAIL 결과 포함 완료 → faultService.createFromInspectionResult 호출")
    void complete_withFail_callsFaultService() {
        InspectionCompleteRequest req = new InspectionCompleteRequest(List.of(
            new InspectionResultRequest(1L, InspectionResultValue.PASS, null),
            new InspectionResultRequest(2L, InspectionResultValue.FAIL, "오일 누유 발견")
        ));

        inspectionService.complete(1L, req);

        verify(faultService, times(1)).createFromInspectionResult(any(InspectionResult.class), eq(inspector));
        assertThat(inspection.getStatus()).isEqualTo(InspectionStatus.COMPLETED);
        assertThat(inspection.isHasAbnormality()).isTrue();
    }

    @Test
    @DisplayName("PASS만 완료 → faultService 미호출, hasAbnormality=false")
    void complete_allPass_noFaultCreated() {
        InspectionCompleteRequest req = new InspectionCompleteRequest(List.of(
            new InspectionResultRequest(1L, InspectionResultValue.PASS, null),
            new InspectionResultRequest(2L, InspectionResultValue.PASS, null)
        ));

        inspectionService.complete(1L, req);

        verify(faultService, never()).createFromInspectionResult(any(), any());
        assertThat(inspection.isHasAbnormality()).isFalse();
    }

    @Test
    @DisplayName("FAIL 2개 완료 → faultService 2번 호출")
    void complete_twoFails_calledTwice() {
        InspectionCompleteRequest req = new InspectionCompleteRequest(List.of(
            new InspectionResultRequest(1L, InspectionResultValue.FAIL, "고온"),
            new InspectionResultRequest(2L, InspectionResultValue.FAIL, "누유")
        ));

        inspectionService.complete(1L, req);

        verify(faultService, times(2)).createFromInspectionResult(any(InspectionResult.class), eq(inspector));
    }

    @Test
    @DisplayName("이미 완료된 점검 재완료 시도 → IllegalStateException")
    void complete_alreadyCompleted_throws() {
        inspection.complete(false);

        assertThatThrownBy(() ->
            inspectionService.complete(1L, new InspectionCompleteRequest(List.of(
                new InspectionResultRequest(1L, InspectionResultValue.PASS, null)
            ))))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("이미 완료된 점검");
    }
}
```

- [ ] **Step 2: 테스트 실행 확인**

```
.\gradlew test --tests "com.factorycare.backend.domain.inspection.service.InspectionServiceTest"
```

Expected: `BUILD SUCCESSFUL`, 4개 테스트 PASS

- [ ] **Step 3: 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/inspection/service/InspectionServiceTest.java
git commit -m "test(inspection): InspectionService 단위 테스트 추가 — FAIL시 장애자동생성 검증"
```

---

### Task 5: FaultRepository QueryDSL 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/fault/repository/FaultRepositoryTest.java`

**Interfaces:**
- 테스트 대상: `FaultRepository.search(FaultSearchCondition, Pageable)`, `countByStatusIn()`
- 검색 조건: status, severity, equipmentId, 날짜범위

- [ ] **Step 1: FaultRepositoryTest 파일 작성**

```java
package com.factorycare.backend.domain.fault.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.fault.dto.FaultSearchCondition;
import com.factorycare.backend.domain.fault.entity.*;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.global.config.JpaConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class FaultRepositoryTest {

    @Autowired FaultRepository faultRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired UserRepository userRepository;

    Equipment eq1, eq2;
    User reporter;

    @BeforeEach
    void setUp() {
        eq1 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());
        eq2 = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-002").name("로봇팔").build());
        reporter = userRepository.save(User.builder()
            .loginId("worker01").password("pw").name("작업자").role(UserRole.WORKER).build());
    }

    private Fault saveFault(Equipment eq, String title, FaultSeverity severity, FaultStatus status) {
        Fault f = Fault.builder()
            .equipment(eq).title(title).severity(severity).reportedBy(reporter).build();
        Fault saved = faultRepository.save(f);
        if (status != FaultStatus.REPORTED) {
            // 상태 전이: REPORTED → CONFIRMED → ... 순서로 변경
            saved.changeStatus(FaultStatus.CONFIRMED);
            if (status == FaultStatus.IN_PROGRESS || status == FaultStatus.RESOLVED) {
                saved.changeStatus(FaultStatus.IN_PROGRESS);
            }
            if (status == FaultStatus.RESOLVED) {
                saved.changeStatus(FaultStatus.RESOLVED);
            }
        }
        return saved;
    }

    @Test
    @DisplayName("status 필터 — REPORTED만 조회")
    void search_byStatus() {
        saveFault(eq1, "장애A", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "장애B", FaultSeverity.LOW, FaultStatus.CONFIRMED);

        FaultSearchCondition cond = new FaultSearchCondition(null, FaultStatus.REPORTED, null, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("장애A");
    }

    @Test
    @DisplayName("severity 필터 — HIGH만 조회")
    void search_bySeverity() {
        saveFault(eq1, "고심각", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "저심각", FaultSeverity.LOW, FaultStatus.REPORTED);

        FaultSearchCondition cond = new FaultSearchCondition(null, null, FaultSeverity.HIGH, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSeverity()).isEqualTo(FaultSeverity.HIGH);
    }

    @Test
    @DisplayName("equipmentId 필터 — eq1만 조회")
    void search_byEquipmentId() {
        saveFault(eq1, "eq1장애", FaultSeverity.MEDIUM, FaultStatus.REPORTED);
        saveFault(eq2, "eq2장애", FaultSeverity.MEDIUM, FaultStatus.REPORTED);

        FaultSearchCondition cond = new FaultSearchCondition(eq1.getId(), null, null, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEquipment().getId()).isEqualTo(eq1.getId());
    }

    @Test
    @DisplayName("조건 없음 — 전체 조회")
    void search_noCondition_all() {
        saveFault(eq1, "장애1", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "장애2", FaultSeverity.LOW, FaultStatus.REPORTED);

        FaultSearchCondition cond = new FaultSearchCondition(null, null, null, null, null, null);
        Page<Fault> result = faultRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("countByStatusIn — REPORTED + CONFIRMED 합산")
    void countByStatusIn() {
        saveFault(eq1, "A", FaultSeverity.HIGH, FaultStatus.REPORTED);
        saveFault(eq2, "B", FaultSeverity.LOW, FaultStatus.CONFIRMED);
        saveFault(eq1, "C", FaultSeverity.MEDIUM, FaultStatus.RESOLVED);

        long count = faultRepository.countByStatusIn(List.of(FaultStatus.REPORTED, FaultStatus.CONFIRMED));

        assertThat(count).isEqualTo(2);
    }
}
```

- [ ] **Step 2: 테스트 실행 확인**

```
.\gradlew test --tests "com.factorycare.backend.domain.fault.repository.FaultRepositoryTest"
```

Expected: `BUILD SUCCESSFUL`, 5개 테스트 PASS

- [ ] **Step 3: 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/fault/repository/FaultRepositoryTest.java
git commit -m "test(fault): FaultRepository QueryDSL 검색 테스트 추가"
```

---

### Task 6: MaintenanceRepository QueryDSL 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceRepositoryTest.java`

**Interfaces:**
- 테스트 대상: `search(MaintenanceSearchCondition, Pageable)`, `countByCreatedAtBetween()`

- [ ] **Step 1: MaintenanceRepositoryTest 파일 작성**

```java
package com.factorycare.backend.domain.maintenance.repository;

import com.factorycare.backend.domain.equipment.entity.Equipment;
import com.factorycare.backend.domain.equipment.repository.EquipmentRepository;
import com.factorycare.backend.domain.maintenance.dto.MaintenanceSearchCondition;
import com.factorycare.backend.domain.maintenance.entity.*;
import com.factorycare.backend.domain.user.entity.User;
import com.factorycare.backend.domain.user.entity.UserRole;
import com.factorycare.backend.domain.user.repository.UserRepository;
import com.factorycare.backend.global.config.JpaConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class MaintenanceRepositoryTest {

    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired UserRepository userRepository;

    Equipment equipment;
    User creator, assignee;

    @BeforeEach
    void setUp() {
        equipment = equipmentRepository.save(Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());
        creator = userRepository.save(User.builder()
            .loginId("manager01").password("pw").name("매니저").role(UserRole.MANAGER).build());
        assignee = userRepository.save(User.builder()
            .loginId("worker01").password("pw").name("작업자").role(UserRole.WORKER).build());
    }

    private MaintenanceTask saveTask(String taskNo, MaintenanceStatus status, User assignedTo) {
        MaintenanceTask task = MaintenanceTask.builder()
            .taskNo(taskNo).equipment(equipment)
            .title("작업 " + taskNo).taskType(MaintenanceType.REPAIR)
            .assignee(assignedTo).createdBy(creator).build();
        MaintenanceTask saved = maintenanceRepository.save(task);
        if (status == MaintenanceStatus.IN_PROGRESS || status == MaintenanceStatus.COMPLETED) {
            saved.start();
        }
        if (status == MaintenanceStatus.COMPLETED) {
            saved.complete();
        }
        return saved;
    }

    @Test
    @DisplayName("status 필터 — PENDING만 조회")
    void search_byStatus() {
        saveTask("MT-2026-001", MaintenanceStatus.PENDING, null);
        saveTask("MT-2026-002", MaintenanceStatus.IN_PROGRESS, assignee);

        MaintenanceSearchCondition cond = new MaintenanceSearchCondition(null, MaintenanceStatus.PENDING, null, null, null, null, null);
        Page<MaintenanceTask> result = maintenanceRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTaskNo()).isEqualTo("MT-2026-001");
    }

    @Test
    @DisplayName("assigneeId 필터 — 특정 담당자 작업만 조회")
    void search_byAssigneeId() {
        saveTask("MT-2026-001", MaintenanceStatus.PENDING, assignee);
        saveTask("MT-2026-002", MaintenanceStatus.PENDING, null);

        MaintenanceSearchCondition cond = new MaintenanceSearchCondition(null, null, null, assignee.getId(), null, null, null);
        Page<MaintenanceTask> result = maintenanceRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAssignee().getId()).isEqualTo(assignee.getId());
    }

    @Test
    @DisplayName("조건 없음 — 전체 조회 + 페이징")
    void search_noCondition_paging() {
        for (int i = 1; i <= 5; i++) {
            saveTask("MT-2026-00" + i, MaintenanceStatus.PENDING, null);
        }

        MaintenanceSearchCondition cond = new MaintenanceSearchCondition(null, null, null, null, null, null, null);
        Page<MaintenanceTask> page = maintenanceRepository.search(cond, PageRequest.of(0, 3));

        assertThat(page.getContent()).hasSize(3);
        assertThat(page.getTotalElements()).isEqualTo(5);
    }

    @Test
    @DisplayName("countByCreatedAtBetween — 올해 생성된 작업 수")
    void countByCreatedAtBetween() {
        saveTask("MT-2026-001", MaintenanceStatus.PENDING, null);
        saveTask("MT-2026-002", MaintenanceStatus.PENDING, null);

        int year = LocalDate.now().getYear();
        long count = maintenanceRepository.countByCreatedAtBetween(
            LocalDate.of(year, 1, 1).atStartOfDay(),
            LocalDate.of(year + 1, 1, 1).atStartOfDay());

        assertThat(count).isEqualTo(2);
    }
}
```

- [ ] **Step 2: 테스트 실행 확인**

```
.\gradlew test --tests "com.factorycare.backend.domain.maintenance.repository.MaintenanceRepositoryTest"
```

Expected: `BUILD SUCCESSFUL`, 4개 테스트 PASS

- [ ] **Step 3: 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/maintenance/repository/MaintenanceRepositoryTest.java
git commit -m "test(maintenance): MaintenanceRepository QueryDSL 검색 테스트 추가"
```

---

### Task 7: PartRepository QueryDSL 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/part/repository/PartRepositoryTest.java`

**Interfaces:**
- 테스트 대상: `search(PartSearchCondition, Pageable)`, `findByIdAndActiveTrue()`
- stockStatus 계산: OUT=0, LOW=0<stock≤minimum, NORMAL=stock>minimum

- [ ] **Step 1: PartRepositoryTest 파일 작성**

```java
package com.factorycare.backend.domain.part.repository;

import com.factorycare.backend.domain.part.dto.PartSearchCondition;
import com.factorycare.backend.domain.part.entity.Part;
import com.factorycare.backend.domain.part.entity.StockStatus;
import com.factorycare.backend.global.config.JpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
class PartRepositoryTest {

    @Autowired PartRepository partRepository;

    private Part savePart(String partNo, String name, int stock, int minimum, boolean active) {
        Part part = Part.builder()
            .partNo(partNo).name(name).manufacturer("제조사")
            .stockQuantity(stock).minimumStock(minimum).storageLocation("A창고").build();
        if (!active) part.deactivate();
        return partRepository.save(part);
    }

    @Test
    @DisplayName("keyword 검색 — name 부분일치")
    void search_byKeyword_name() {
        savePart("PT-2026-001", "베어링A", 10, 5, true);
        savePart("PT-2026-002", "오일필터", 20, 3, true);

        PartSearchCondition cond = new PartSearchCondition("베어링", null, null);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("베어링A");
    }

    @Test
    @DisplayName("stockStatus=LOW — 재고 <= minimumStock이고 0 초과인 부품")
    void search_byStockStatus_low() {
        savePart("PT-2026-001", "저재고부품", 3, 5, true);  // LOW: stock(3) <= min(5)
        savePart("PT-2026-002", "정상부품", 20, 5, true);   // NORMAL
        savePart("PT-2026-003", "품절부품", 0, 5, true);    // OUT

        PartSearchCondition cond = new PartSearchCondition(null, null, StockStatus.LOW);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("저재고부품");
    }

    @Test
    @DisplayName("stockStatus=OUT — 재고 0인 부품")
    void search_byStockStatus_out() {
        savePart("PT-2026-001", "품절부품", 0, 5, true);
        savePart("PT-2026-002", "정상부품", 10, 5, true);

        PartSearchCondition cond = new PartSearchCondition(null, null, StockStatus.OUT);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("품절부품");
    }

    @Test
    @DisplayName("soft delete된 부품은 search에서 제외")
    void search_softDeleted_excluded() {
        savePart("PT-2026-001", "활성부품", 10, 5, true);
        savePart("PT-2026-002", "비활성부품", 10, 5, false);

        PartSearchCondition cond = new PartSearchCondition(null, null, null);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("활성부품");
    }

    @Test
    @DisplayName("findByIdAndActiveTrue — soft delete된 부품은 Optional.empty()")
    void findByIdAndActiveTrue_softDeleted_returnsEmpty() {
        Part part = savePart("PT-2026-001", "삭제부품", 10, 5, true);
        part.deactivate();
        partRepository.save(part);

        Optional<Part> result = partRepository.findByIdAndActiveTrue(part.getId());

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("storageLocation 필터 — A창고만 조회")
    void search_byStorageLocation() {
        savePart("PT-2026-001", "부품A", 10, 5, true); // A창고
        Part b = Part.builder().partNo("PT-2026-002").name("부품B").manufacturer("제조사")
            .stockQuantity(5).minimumStock(1).storageLocation("B창고").build();
        partRepository.save(b);

        PartSearchCondition cond = new PartSearchCondition(null, "A창고", null);
        Page<Part> result = partRepository.search(cond, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("부품A");
    }
}
```

- [ ] **Step 2: 테스트 실행 확인**

```
.\gradlew test --tests "com.factorycare.backend.domain.part.repository.PartRepositoryTest"
```

Expected: `BUILD SUCCESSFUL`, 6개 테스트 PASS

- [ ] **Step 3: 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/part/repository/PartRepositoryTest.java
git commit -m "test(part): PartRepository QueryDSL 검색 테스트 추가 — keyword/stockStatus/softdelete"
```

---

### Task 8: 유지보수-부품 통합 플로우 테스트

**Files:**
- Create: `backend/src/test/java/com/factorycare/backend/domain/part/MaintenancePartFlowTest.java`

**Interfaces:**
- 기존 FaultAutoCreateTest(점검→장애) 패턴 동일
- 시나리오: 유지보수 작업 생성 → 부품 사용 등록(재고 감소 확인) → 부품 사용 삭제(재고 복원 확인) → 작업 완료 → 완료 후 부품 추가 차단

- [ ] **Step 1: MaintenancePartFlowTest 파일 작성**

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
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MaintenancePartFlowTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired EquipmentRepository equipmentRepository;
    @Autowired MaintenanceRepository maintenanceRepository;
    @Autowired PartRepository partRepository;
    @Autowired PartUsageRepository partUsageRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtProvider jwtProvider;

    String managerToken, workerToken;
    Equipment equipment;
    Part part;
    User worker, manager;

    @BeforeEach
    void setUp() {
        partUsageRepository.deleteAll();
        maintenanceRepository.deleteAll();
        partRepository.deleteAll();
        equipmentRepository.deleteAll();
        userRepository.deleteAll();

        manager = userRepository.save(User.builder()
            .loginId("manager01").password(passwordEncoder.encode("pw"))
            .name("매니저").role(UserRole.MANAGER).build());
        worker = userRepository.save(User.builder()
            .loginId("worker01").password(passwordEncoder.encode("pw"))
            .name("작업자").role(UserRole.WORKER).build());

        managerToken = "Bearer " + jwtProvider.generateAccessToken(manager.getId(), UserRole.MANAGER);
        workerToken = "Bearer " + jwtProvider.generateAccessToken(worker.getId(), UserRole.WORKER);

        equipment = equipmentRepository.save(
            Equipment.builder().equipmentNo("EQ-001").name("컨베이어").build());
        part = partRepository.save(Part.builder()
            .partNo("PT-2026-001").name("베어링A").manufacturer("한국부품")
            .stockQuantity(20).minimumStock(5).build());
    }

    @Test
    @DisplayName("전체 플로우: 작업생성 → 부품사용(재고감소) → 부품삭제(재고복원) → 작업완료 → 완료후부품추가차단")
    void fullFlow() throws Exception {
        // 1. 작업 생성
        var createBody = Map.of("equipmentId", equipment.getId(), "title", "모터 수리", "taskType", "REPAIR");
        MvcResult createResult = mockMvc.perform(post("/api/maintenance")
                .header("Authorization", managerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createBody)))
            .andExpect(status().isCreated())
            .andReturn();

        Long taskId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // 2. 작업 시작
        mockMvc.perform(post("/api/maintenance/" + taskId + "/start")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "시작"))))
            .andExpect(status().isOk());

        // 3. 부품 사용 등록 (재고 20 → 17)
        var usageBody = Map.of("partId", part.getId(), "quantity", 3, "note", "베어링 교체");
        MvcResult usageResult = mockMvc.perform(post("/api/maintenance/" + taskId + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(usageBody)))
            .andExpect(status().isCreated())
            .andReturn();

        Long usageId = objectMapper.readTree(usageResult.getResponse().getContentAsString()).get("id").asLong();
        assertThat(partRepository.findById(part.getId()).get().getStockQuantity()).isEqualTo(17);

        // 4. 부품 사용 삭제 (재고 17 → 20 복원)
        mockMvc.perform(delete("/api/maintenance/" + taskId + "/parts/" + usageId)
                .header("Authorization", workerToken))
            .andExpect(status().isNoContent());

        assertThat(partRepository.findById(part.getId()).get().getStockQuantity()).isEqualTo(20);

        // 5. 다시 부품 등록 (재고 20 → 15)
        var usageBody2 = Map.of("partId", part.getId(), "quantity", 5);
        mockMvc.perform(post("/api/maintenance/" + taskId + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(usageBody2)))
            .andExpect(status().isCreated());

        // 6. 작업 완료
        mockMvc.perform(post("/api/maintenance/" + taskId + "/complete")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("content", "완료", "durationMinutes", 60))))
            .andExpect(status().isOk());

        // 7. 완료된 작업에 부품 추가 시도 → 409
        mockMvc.perform(post("/api/maintenance/" + taskId + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("partId", part.getId(), "quantity", 1))))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("재고 부족 시 부품 사용 등록 → 409")
    void partUsage_insufficientStock_409() throws Exception {
        MaintenanceTask task = maintenanceRepository.save(MaintenanceTask.builder()
            .taskNo("MT-2026-001").equipment(equipment).title("테스트")
            .taskType(MaintenanceType.REPAIR).createdBy(worker).build());
        task.start();
        maintenanceRepository.save(task);

        var body = Map.of("partId", part.getId(), "quantity", 999);
        mockMvc.perform(post("/api/maintenance/" + task.getId() + "/parts")
                .header("Authorization", workerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }
}
```

- [ ] **Step 2: 테스트 실행 확인**

```
.\gradlew test --tests "com.factorycare.backend.domain.part.MaintenancePartFlowTest"
```

Expected: `BUILD SUCCESSFUL`, 2개 테스트 PASS

- [ ] **Step 3: 전체 테스트 실행 — 기존 테스트 포함 전부 PASS 확인**

```
.\gradlew test
```

Expected: `BUILD SUCCESSFUL`, 총 120개 내외 테스트 PASS (기존 77 + 신규 ~43)

- [ ] **Step 4: 최종 커밋**

```
git add backend/src/test/java/com/factorycare/backend/domain/part/MaintenancePartFlowTest.java
git commit -m "test(integration): 유지보수-부품 통합 플로우 테스트 추가 — 재고감소/복원/완료후차단"
```

---

## 완료 기준 체크리스트

- [ ] `FaultServiceTest` — 6개 (create, create 실패, createFromInspectionResult, changeStatus 성공/실패, assign)
- [ ] `MaintenanceServiceTest` — 8개 (create, start 성공/실패, complete 성공/실패, cancel 성공/실패, delete 성공/실패)
- [ ] `PartServiceTest` — 5개 (create, adjustStock 성공/실패, delete softdelete, findById 실패)
- [ ] `PartUsageServiceTest` — 5개 (create 성공/COMPLETED차단/재고부족, delete 재고복원/접근제어)
- [ ] `InspectionServiceTest` — 4개 (FAIL호출, PASS미호출, FAIL2개, 중복완료)
- [ ] `FaultRepositoryTest` — 5개 (status/severity/equipmentId/noCondition/countByStatusIn)
- [ ] `MaintenanceRepositoryTest` — 4개 (status/assigneeId/paging/countByCreatedAtBetween)
- [ ] `PartRepositoryTest` — 6개 (keyword/LOW/OUT/softdelete/findByIdAndActive/location)
- [ ] `MaintenancePartFlowTest` — 2개 (fullFlow, 재고부족 409)
- [ ] `.\gradlew test` 전체 통과 (기존 77 + 신규 45 = 122개 내외)
