# Dashboard 설계 (WBS 9.0~9.3)

날짜: 2026-08-21

## 개요

설비 유지보수 관리 시스템의 메인 대시보드. 단일 API endpoint로 KPI·차트·목록 데이터를 한 번에 조회하고, 기간/설비상태 필터로 실시간 갱신.

---

## 백엔드

### Endpoint

```
GET /api/dashboard/summary
```

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `period` | int | 30 | 조회 기간 (일). 7 / 30 / 90 |
| `equipmentStatus` | string | ALL | 설비 상태 필터. ALL / NORMAL / INSPECTION_NEEDED / BROKEN / REPAIRING / DISCARDED |

**Response:**

```json
{
  "kpi": {
    "totalEquipments": 12,
    "normalEquipments": 8,
    "brokenEquipments": 2,
    "pendingMaintenance": 3,
    "unresolvedFaults": 4,
    "scheduledInspections": 6
  },
  "faultTrend": [
    { "month": "3월", "count": 5 },
    { "month": "4월", "count": 3 },
    { "month": "5월", "count": 7 },
    { "month": "6월", "count": 2 },
    { "month": "7월", "count": 4 },
    { "month": "8월", "count": 1 }
  ],
  "equipmentStatusDistribution": [
    { "status": "NORMAL",             "label": "정상",     "count": 8 },
    { "status": "INSPECTION_NEEDED",  "label": "점검필요", "count": 1 },
    { "status": "BROKEN",             "label": "고장",     "count": 2 },
    { "status": "REPAIRING",          "label": "수리중",   "count": 1 },
    { "status": "DISCARDED",          "label": "폐기",     "count": 0 }
  ],
  "recentFaults": [
    {
      "id": 1,
      "title": "CNC 머신 과부하",
      "equipmentName": "CNC-001",
      "severity": "HIGH",
      "status": "OPEN",
      "reportedAt": "2026-08-20"
    }
  ],
  "recentMaintenance": [
    {
      "id": 1,
      "title": "정기 오일 교환",
      "taskNo": "MT-2026-001",
      "equipmentName": "CNC-001",
      "status": "IN_PROGRESS",
      "scheduledDate": "2026-08-21"
    }
  ]
}
```

### 구현 파일

```
backend/src/main/java/com/factorycare/backend/domain/dashboard/
  controller/DashboardController.java
  service/DashboardService.java
  dto/DashboardSummaryResponse.java
  dto/KpiResponse.java
  dto/FaultTrendItem.java
  dto/EquipmentStatusItem.java
  dto/DashboardFaultItem.java
  dto/DashboardMaintenanceItem.java
```

### 데이터 집계 로직

- **KPI:**
  - `totalEquipments` — `equipmentStatus=ALL`이면 전체, 아니면 해당 상태 count
  - `normalEquipments` — status=NORMAL count
  - `brokenEquipments` — status=BROKEN count
  - `pendingMaintenance` — maintenance status=PENDING count
  - `unresolvedFaults` — fault status IN (OPEN, CONFIRMED, IN_PROGRESS) count
  - `scheduledInspections` — scheduledDate between now and now+period인 inspection_schedules count

- **faultTrend** — 최근 6개월 각 월의 fault 등록 건수 (period 파라미터와 무관하게 항상 6개월)

- **equipmentStatusDistribution** — 전체 설비 상태별 count (equipmentStatus 필터 미적용)

- **recentFaults** — 최신 5건, severity DESC, reportedAt DESC

- **recentMaintenance** — 최신 5건, scheduledDate ASC

### 권한

`authenticated()` — 모든 로그인 사용자 접근 가능 (역할 제한 없음)

---

## 프론트엔드

### 파일 구조

```
frontend/src/
  api/dashboard.ts                   ← 신규: API 호출
  pages/DashboardPage.tsx            ← 기존 파일 전면 교체
```

### 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ 설비 관제 대시보드          [기간▼] [설비상태▼]       │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ 전체설비 │ 정상설비 │ 고장설비 │ 대기정비 │미해결장애│ 예정점검 │
├──────────┴──────────┴──────────┴──────────┴──────────┤
│ 월별 장애 추이 (AreaChart)  │ 설비 상태 분포 (Doughnut)│
├─────────────────────────────┼────────────────────────┤
│ 최근 장애 목록              │ 최근 정비작업 목록       │
└─────────────────────────────┴────────────────────────┘
```

### 필터 상태

```ts
const [period, setPeriod] = useState<7 | 30 | 90>(30)
const [equipmentStatus, setEquipmentStatus] = useState<string>('ALL')
```

필터 변경 시 `queryKey: ['dashboard', period, equipmentStatus]` 변경 → 자동 refetch.

### KPI 카드 (6개)

| label | value key | 아이콘 | 링크 |
|---|---|---|---|
| 전체 설비 | totalEquipments | Activity | /equipments |
| 정상 설비 | normalEquipments | CheckCircle2 | /equipments |
| 고장 설비 | brokenEquipments | AlertTriangle | /faults |
| 대기 정비 | pendingMaintenance | Wrench | /maintenance |
| 미해결 장애 | unresolvedFaults | AlertOctagon | /faults |
| 예정 점검 | scheduledInspections | CalendarCheck | /inspection-schedules |

### 차트

**AreaChart (월별 장애 추이)**
- 라이브러리: `react-chartjs-2` (Line + fill)
- X축: month, Y축: count
- 색상: `var(--color-chart-1)` (primary amber)

**Doughnut (설비 상태 분포)**
- 라이브러리: `react-chartjs-2` (Doughnut)
- 색상: green(정상) / yellow(점검필요) / red(고장) / blue(수리중) / gray(폐기)
- 범례: 차트 하단

### 로딩/에러

- 로딩: KPI 카드 skeleton (pulse animation)
- 에러: "데이터를 불러오지 못했습니다. 새로고침해주세요." 안내

---

## 완료 기준

- [ ] `GET /api/dashboard/summary` 정상 응답
- [ ] KPI 카드 6개 데이터 표시
- [ ] 월별 장애 추이 AreaChart 표시
- [ ] 설비 상태 분포 Doughnut 표시
- [ ] 기간 필터 변경 시 KPI 갱신
- [ ] 설비 상태 필터 변경 시 KPI 갱신
- [ ] 최근 장애/정비 목록 표시
