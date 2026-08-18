# 장애관리 (Fault Management) 설계 명세

날짜: 2026-08-15  
WBS: 6.0~6.3

---

## 1. 개요

설비 고장/장애를 등록·추적·해결하는 도메인.  
수동 등록 또는 점검 결과(`InspectionResult.needsFaultReport = true`)에서 자동 생성.  
해결 완료 시 WBS 7.0 유지보수 작업과 연결 예정.

---

## 2. 도메인 구조

### 엔티티 관계

```
Fault (장애)
  ├─ Equipment (FK) — 장애 발생 설비
  ├─ User reportedBy (FK) — 등록자
  ├─ User assignedTo (FK, nullable) — 담당자
  ├─ InspectionResult (FK, nullable) — 점검결과 연동 시
  ├─ severity: LOW | MEDIUM | HIGH | CRITICAL
  └─ status: REPORTED → CONFIRMED → IN_PROGRESS → RESOLVED → CLOSED

FaultStatusHistory (상태변경 이력)
  ├─ Fault (FK)
  ├─ User changedBy (FK)
  ├─ fromStatus
  ├─ toStatus
  ├─ reason: TEXT
  └─ changedAt: LocalDateTime
```

### DB 테이블

| 테이블 | 설명 |
|---|---|
| `faults` | 장애 기록 |
| `fault_status_histories` | 상태변경 이력 |

---

## 3. 상태 흐름

```
REPORTED → CONFIRMED (담당자 확인)
         → IN_PROGRESS (수리 시작)
         → RESOLVED (수리 완료)
         → CLOSED (최종 종결)
```

- `REPORTED`: 최초 등록 상태 (수동 or 점검 자동)
- `CONFIRMED`: ADMIN/MANAGER가 확인
- `IN_PROGRESS`: 담당자 배정 후 작업 시작
- `RESOLVED`: 수리 완료, 검토 대기
- `CLOSED`: ADMIN이 최종 종결

### 전이 규칙

| 현재 상태 | 허용 다음 상태 | 최소 권한 |
|---|---|---|
| REPORTED | CONFIRMED | MANAGER |
| CONFIRMED | IN_PROGRESS | MANAGER |
| IN_PROGRESS | RESOLVED | WORKER (본인) / MANAGER |
| RESOLVED | CLOSED | MANAGER |
| RESOLVED | IN_PROGRESS | MANAGER (재작업) |

---

## 4. API 설계

### Fault CRUD

| Method | URL | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/faults` | ALL | 목록 (QueryDSL 검색) |
| GET | `/api/faults/{id}` | ALL | 상세 + 이력 |
| POST | `/api/faults` | ALL | 장애 등록 |
| PATCH | `/api/faults/{id}` | MANAGER+ | 수정 |
| DELETE | `/api/faults/{id}` | ADMIN | 삭제 |

### 상태변경

| Method | URL | 권한 | 설명 |
|---|---|---|---|
| PATCH | `/api/faults/{id}/status` | MANAGER+ | 상태 전이 |
| PATCH | `/api/faults/{id}/assign` | MANAGER+ | 담당자 배정 |

### 검색 파라미터 (QueryDSL)

```
equipmentId, status, severity, assigneeId, from, to (createdAt 범위)
page, size, sort
```

---

## 5. 응답 구조

### FaultResponse

```json
{
  "id": 1,
  "equipmentId": 10,
  "equipmentName": "컨베이어 A",
  "title": "모터 과열",
  "description": "작동 중 이상 소음 발생",
  "severity": "HIGH",
  "status": "REPORTED",
  "reportedById": 2,
  "reportedByName": "홍길동",
  "assignedToId": null,
  "assignedToName": null,
  "inspectionResultId": null,
  "resolvedAt": null,
  "createdAt": "2026-08-15T10:00:00"
}
```

### FaultStatusHistoryResponse

```json
{
  "id": 1,
  "fromStatus": "REPORTED",
  "toStatus": "CONFIRMED",
  "changedByName": "김매니저",
  "reason": "현장 확인 완료",
  "changedAt": "2026-08-15T11:00:00"
}
```

---

## 6. 화면 구조 (Frontend 4페이지)

| 페이지 | 경로 | 설명 |
|---|---|---|
| FaultListPage | `/faults` | 목록 + 검색 필터 (severity/status) + 페이지네이션 |
| FaultCreatePage | `/faults/new` | 장애 등록 폼 |
| FaultDetailPage | `/faults/:id` | 상세 + 상태변경 이력 |
| FaultStatusModal | (모달) | 상태전이 선택 + 사유 입력 |

---

## 7. 점검결과 연동

`InspectionResult.needsFaultReport = true` → 점검 완료 시점에 Fault 자동 생성:
- `equipment`: 해당 점검 일정의 설비
- `title`: `"[점검이상] {checklistItem.itemName}"`
- `severity`: `MEDIUM` (기본값)
- `reportedBy`: 점검 수행자
- `inspectionResult`: FK 연결

자동 생성은 `InspectionService.complete()` 내부에서 처리.
