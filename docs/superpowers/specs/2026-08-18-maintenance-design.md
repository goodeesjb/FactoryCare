# 유지보수관리 설계 명세

**WBS:** 7.0~7.4  
**날짜:** 2026-08-18  
**브랜치:** `feat/maintenance` (백엔드), `feat/maintenance-frontend` (프론트엔드)

---

## 목표

설비 유지보수 작업을 생성·배정·수행·완료하는 워크플로우 구현. Fault에서 반자동으로 연동되며, 작업 시작/완료 시 이력을 기록한다.

---

## 엔티티 설계

### MaintenanceTask

| 필드 | 타입 | 제약 |
|---|---|---|
| id | Long | PK |
| taskNo | String | 자동생성 `MT-YYYY-NNN`, UNIQUE |
| equipment | Equipment | FK, NOT NULL |
| fault | Fault | FK, nullable |
| title | String(200) | NOT NULL |
| description | TEXT | nullable |
| taskType | MaintenanceType | NOT NULL |
| priority | MaintenancePriority | NOT NULL, default MEDIUM |
| assignee | User | FK, nullable |
| scheduledDate | LocalDate | nullable |
| status | MaintenanceStatus | NOT NULL, default PENDING |
| createdBy | User | FK, NOT NULL |
| completedAt | LocalDateTime | nullable |
| createdAt | LocalDateTime | Auditing |

### MaintenanceHistory

| 필드 | 타입 | 제약 |
|---|---|---|
| id | Long | PK |
| maintenanceTask | MaintenanceTask | FK, NOT NULL |
| recordedBy | User | FK, NOT NULL |
| type | MaintenanceHistoryType | NOT NULL |
| content | TEXT | NOT NULL |
| durationMinutes | Integer | nullable (완료 시 소요시간) |
| recordedAt | LocalDateTime | NOT NULL, default now() |

### Enum 목록

```java
enum MaintenanceStatus   { PENDING, IN_PROGRESS, COMPLETED, CANCELLED }
enum MaintenanceType     { REPAIR, PREVENTIVE, INSPECTION_FOLLOWUP, OTHER }
enum MaintenancePriority { LOW, MEDIUM, HIGH, CRITICAL }
enum MaintenanceHistoryType { START, COMPLETE }
```

### 상태머신

```
PENDING     → IN_PROGRESS  (start: content 필수, History[START] 생성)
IN_PROGRESS → COMPLETED    (complete: content 필수, durationMinutes 선택, History[COMPLETE] 생성, completedAt 기록)
PENDING     → CANCELLED    (cancel)
IN_PROGRESS → CANCELLED    (cancel)
COMPLETED   → (불변)
CANCELLED   → (불변)
```

---

## API 설계

| Method | Endpoint | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/maintenance` | ALL | 목록 (페이지네이션 + QueryDSL 검색) |
| POST | `/api/maintenance` | MANAGER/ADMIN | 작업 생성 |
| GET | `/api/maintenance/{id}` | ALL | 상세 조회 |
| PATCH | `/api/maintenance/{id}` | MANAGER/ADMIN | 작업 수정 |
| DELETE | `/api/maintenance/{id}` | ADMIN | 작업 삭제 (COMPLETED 제외) |
| PATCH | `/api/maintenance/{id}/assign` | MANAGER/ADMIN | 담당자 배정 |
| POST | `/api/maintenance/{id}/start` | ALL | 작업 시작 (content 입력) |
| POST | `/api/maintenance/{id}/complete` | ALL | 작업 완료 (content + durationMinutes) |
| PATCH | `/api/maintenance/{id}/cancel` | MANAGER/ADMIN | 작업 취소 |

### QueryDSL 검색 조건 (`GET /api/maintenance`)

- `equipmentId`, `status`, `priority`, `assigneeId`, `faultId`
- `from`, `to` (scheduledDate 기준)

---

## Fault 연동

`FaultDetailPage`에 "정비작업 생성" 버튼 추가 (MANAGER/ADMIN만 노출).

클릭 시 `MaintenanceCreatePage`로 이동하며 `faultId` 쿼리파라미터 전달.  
`MaintenanceCreatePage`에서 `faultId` 감지 시:
- equipment 자동 선택 (Fault의 설비)
- taskType 자동 선택 (`REPAIR`)
- fault FK 자동 연결

---

## 프론트엔드 구성

### 페이지 목록

| 페이지 | 경로 | 설명 |
|---|---|---|
| MaintenanceListPage | `/maintenance` | 목록, 상태/우선순위 필터, 페이지네이션 |
| MaintenanceCreatePage | `/maintenance/new` | 작업 생성 폼 |
| MaintenanceDetailPage | `/maintenance/:id` | 상세 + 액션 버튼 + 이력 타임라인 |
| FaultDetailPage (수정) | `/faults/:id` | "정비작업 생성" 버튼 추가 |

### MaintenanceDetailPage 액션 버튼 노출 규칙

| 상태 | 버튼 |
|---|---|
| PENDING | 시작 (ALL), 배정 (MANAGER/ADMIN), 취소 (MANAGER/ADMIN) |
| IN_PROGRESS | 완료 (ALL), 취소 (MANAGER/ADMIN) |
| COMPLETED / CANCELLED | 없음 |

### 이력 타임라인

MaintenanceDetailPage 하단에 START → COMPLETE 순서로 이력 표시.  
각 항목: type 배지, 작업자명, content, durationMinutes(완료 시), recordedAt.

---

## 기술 제약

- 패키지 루트: `com.factorycare.backend.domain.maintenance`
- Entity: `@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)` + `@Builder`
- DTO: Java record + `static from(Entity)` 팩토리
- 테스트: `@ActiveProfiles("test")`, H2 in-memory, MockMvc
- Frontend: axiosInstance, TanStack Query v5, Tailwind CSS
- `SpringPage<T>`: `frontend/src/types/equipment.ts`에서 import (재정의 금지)
- `GlobalExceptionHandler`: `IllegalStateException` → 409, `IllegalArgumentException` → 400

---

## 구현 범위 제외

- 부품 사용 기록 (WBS 8에서 재고연동과 함께 설계)
- 알림 (WBS 2차 목표)
- 파일 첨부 (WBS 2차 목표)
