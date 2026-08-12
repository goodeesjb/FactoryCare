# 점검관리 (Inspection Management) 설계 명세

날짜: 2026-08-12  
WBS: 5.0~5.3

---

## 1. 개요

설비별 정기 점검 일정을 관리하고, 실제 점검 수행 결과를 기록하는 도메인.  
이상 항목 발견 시 WBS 6.0 장애관리와 연결 예정.

---

## 2. 도메인 구조

### 엔티티 관계

```
InspectionChecklist (템플릿)
  └─ InspectionChecklistItem[] (항목: 모터/센서/오일 등)

InspectionSchedule (일정)
  ├─ Equipment (FK)
  ├─ InspectionChecklist (FK)
  ├─ User assignee (FK)
  └─ status: SCHEDULED | IN_PROGRESS | COMPLETED | OVERDUE

Inspection (실제 점검 기록)
  ├─ InspectionSchedule (FK)
  ├─ User inspector (FK)
  ├─ status: IN_PROGRESS | COMPLETED
  └─ hasAbnormality: boolean

InspectionResult (항목별 결과)
  ├─ Inspection (FK)
  ├─ InspectionChecklistItem (FK)
  ├─ result: PASS | FAIL | SKIPPED
  ├─ note: TEXT (비고)
  └─ needsFaultReport: boolean  ← WBS 6.0에서 Fault 자동 생성에 사용
```

### DB 테이블

| 테이블 | 설명 |
|---|---|
| `inspection_checklists` | 체크리스트 템플릿 |
| `inspection_checklist_items` | 템플릿 항목 |
| `inspection_schedules` | 점검 일정 |
| `inspections` | 실제 점검 수행 기록 |
| `inspection_results` | 항목별 결과 |

---

## 3. 상태 흐름

### InspectionSchedule
```
SCHEDULED → IN_PROGRESS (start API 호출 시 Inspection 생성)
          → COMPLETED (Inspection 완료 시)
          → OVERDUE (예정일 초과, 배치 or 조회 시 계산)
```

### Inspection
```
IN_PROGRESS → COMPLETED (complete API 호출 시)
```

### InspectionResult.result
```
PASS | FAIL | SKIPPED
```
- FAIL 항목 존재 → `Inspection.hasAbnormality = true`
- FAIL 항목 → `InspectionResult.needsFaultReport = true` 자동 세팅

---

## 4. API 설계

### 체크리스트 템플릿

| Method | URL | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/inspection-checklists` | ALL | 목록 조회 |
| POST | `/api/inspection-checklists` | ADMIN/MANAGER | 템플릿 생성 |
| GET | `/api/inspection-checklists/{id}` | ALL | 상세 조회 (항목 포함) |
| PATCH | `/api/inspection-checklists/{id}` | ADMIN/MANAGER | 수정 |
| DELETE | `/api/inspection-checklists/{id}` | ADMIN | 삭제 |

### 점검 일정

| Method | URL | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/inspection-schedules` | ALL | 목록 조회 (페이징, 필터) |
| POST | `/api/inspection-schedules` | ADMIN/MANAGER | 일정 생성 |
| GET | `/api/inspection-schedules/{id}` | ALL | 상세 조회 |
| PATCH | `/api/inspection-schedules/{id}` | ADMIN/MANAGER | 수정 |
| DELETE | `/api/inspection-schedules/{id}` | ADMIN/MANAGER | 삭제 |
| POST | `/api/inspection-schedules/{id}/start` | ADMIN/MANAGER | 점검 시작 → Inspection 생성 |

### 점검 수행

| Method | URL | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/inspections` | ALL | 목록 조회 (페이징, 필터) |
| GET | `/api/inspections/{id}` | ALL | 상세 조회 (결과 포함) |
| POST | `/api/inspections/{id}/complete` | WORKER/MANAGER/ADMIN | 결과 입력 + 완료 처리 |

---

## 5. 권한 요약

| 기능 | ADMIN | MANAGER | WORKER |
|---|---|---|---|
| 체크리스트 CRUD | ✓ | ✓ | 조회만 |
| 일정 생성/수정/삭제 | ✓ | ✓ | 조회만 |
| 점검 시작 | ✓ | ✓ | - |
| 점검 수행(결과 입력) | ✓ | ✓ | ✓ (담당자) |
| 조회 | ✓ | ✓ | ✓ |

---

## 6. 기술 결정

- 기존 Equipment 도메인 패턴 그대로 따름 (Controller → Service → Repository)
- QueryDSL: InspectionSchedule 검색 필터 (설비, 상태, 날짜 범위, 담당자)
- OVERDUE 판단: DB 컬럼 없음, 조회 시 `scheduledDate < today AND status = SCHEDULED` 로 계산
- WBS 6.0 연결 예약: `InspectionResult.needsFaultReport = true` 항목을 6.0에서 읽어 Fault 자동 생성

---

## 7. 범위 외 (이번 WBS 제외)

- Fault 자동 생성 로직 (WBS 6.0)
- 점검 주기 기반 일정 자동 생성 배치 (WBS 후속)
- 알림 (WBS별도)
