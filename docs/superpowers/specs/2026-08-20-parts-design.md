# 부품관리 (Parts) 설계 문서

**날짜:** 2026-08-20  
**WBS:** 8.0~8.3 부품관리  
**예상 소요:** 2일

---

## 1. 개요

유지보수 작업에서 사용하는 부품의 재고를 관리하고, 작업별 부품 사용 이력을 추적한다.  
재고가 최소수량 이하로 떨어지면 시각적 경고를 표시한다.

**핵심 흐름:**  
부품 등록 → 재고 관리 → 유지보수 작업 진행 중 부품 사용 등록 → 재고 자동 차감 → 재고 부족 경고

---

## 2. 데이터 모델

### Part 엔티티 (`parts` 테이블)

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Long | PK | |
| partNo | String(20) | UNIQUE, NOT NULL | 부품번호 (PT-2026-001) |
| name | String(200) | NOT NULL | 부품명 |
| manufacturer | String(100) | | 제조사 |
| stockQuantity | Integer | NOT NULL, ≥ 0 | 현재 재고수량 |
| minimumStock | Integer | NOT NULL, default 0 | 최소재고 (경고 기준) |
| storageLocation | String(200) | | 보관위치 |
| description | TEXT | | 설명 |
| active | Boolean | NOT NULL, default true | 소프트 삭제 플래그 |
| createdAt | LocalDateTime | NOT NULL | 생성일시 |

**재고 상태 판정:**
- `NORMAL`: stockQuantity > minimumStock
- `LOW`: 0 < stockQuantity ≤ minimumStock
- `OUT`: stockQuantity = 0

### PartUsage 엔티티 (`part_usages` 테이블)

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | Long | PK | |
| part | ManyToOne | NOT NULL | → Part |
| maintenanceTask | ManyToOne | NOT NULL | → MaintenanceTask |
| quantity | Integer | NOT NULL, ≥ 1 | 사용 수량 |
| note | String(500) | | 메모 |
| usedBy | ManyToOne | NOT NULL | → User (등록자) |
| usedAt | LocalDateTime | NOT NULL | 등록 시각 |

**재고 로직:**
- `PartUsage` 등록 시: `part.stockQuantity -= quantity` (재고 부족 시 예외)
- `PartUsage` 삭제 시: `part.stockQuantity += quantity` (재고 복구)

---

## 3. API 설계

### 부품 관리 (`/api/parts`)

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | `/api/parts` | 목록 + 검색 | ALL |
| POST | `/api/parts` | 부품 등록 | ADMIN/MANAGER |
| GET | `/api/parts/{id}` | 상세 조회 | ALL |
| PATCH | `/api/parts/{id}` | 수정 | ADMIN/MANAGER |
| DELETE | `/api/parts/{id}` | 소프트 삭제 | ADMIN |
| PATCH | `/api/parts/{id}/stock` | 재고 직접 조정 (입고) | ADMIN/MANAGER |

### 부품 사용 (`/api/maintenance/{id}/parts`)

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | `/api/maintenance/{id}/parts` | 작업별 사용 부품 목록 | ALL |
| POST | `/api/maintenance/{id}/parts` | 부품 사용 등록 → 재고 차감 | WORKER+ |
| DELETE | `/api/maintenance/{id}/parts/{usageId}` | 사용 취소 → 재고 복구 | WORKER+ |

### 검색 조건 (`PartSearchCondition`)

| 파라미터 | 타입 | 설명 |
|---|---|---|
| keyword | String | 부품명 또는 제조사 LIKE 검색 |
| storageLocation | String | 보관위치 LIKE 검색 |
| stockStatus | Enum | ALL / LOW (≤ 최소재고) / OUT (= 0) |

페이징: `page`, `size` (기본 20)

---

## 4. 백엔드 구조

```
domain/part/
├── controller/
│   ├── PartController.java          # /api/parts
│   └── PartUsageController.java     # /api/maintenance/{id}/parts
├── dto/
│   ├── PartCreateRequest.java
│   ├── PartUpdateRequest.java
│   ├── PartStockAdjustRequest.java
│   ├── PartResponse.java
│   ├── PartSearchCondition.java
│   ├── PartUsageCreateRequest.java
│   └── PartUsageResponse.java
├── entity/
│   ├── Part.java
│   ├── PartUsage.java
│   └── StockStatus.java             # NORMAL / LOW / OUT
├── repository/
│   ├── PartRepository.java
│   ├── PartRepositoryCustom.java
│   ├── PartRepositoryImpl.java      # QueryDSL
│   └── PartUsageRepository.java
└── service/
    ├── PartService.java
    └── PartUsageService.java
```

---

## 5. 프론트엔드 구조

### 신규 페이지

| 페이지 | 경로 | 설명 |
|---|---|---|
| `PartListPage` | `/parts` | 목록 + 검색/필터 + 재고부족 배지 |
| `PartFormPage` | `/parts/new`, `/parts/:id/edit` | 등록/수정 폼 |
| `PartDetailPage` | `/parts/:id` | 상세 + 사용이력 목록 |

### 기존 페이지 수정

- `MaintenanceDetailPage`: "사용 부품" 섹션 추가
  - 사용 부품 목록 테이블 (부품명, 수량, 등록자, 등록일)
  - "부품 추가" 버튼 → 모달
    - 부품명 검색 + 드롭다운 선택
    - 수량 입력
    - 현재 재고 표시 ("현재 재고: N개")
    - 재고 부족 시 경고 문구
  - 사용 취소 버튼 (재고 복구)
- `Layout.tsx`: 사이드바에 "부품 관리" 메뉴 추가

### 재고 경고 표시

- `PartListPage`: 재고 ≤ 최소재고 → `destructive` 배지 "부족"
- `PartListPage`: 재고 = 0 → `destructive` 배지 "소진"
- 부품 추가 모달: 현재 재고 수량 실시간 표시

### 파일 구조

```
src/
├── api/parts.ts
├── types/parts.ts
└── pages/parts/
    ├── PartListPage.tsx
    ├── PartFormPage.tsx
    └── PartDetailPage.tsx
```

---

## 6. 주요 비즈니스 규칙

1. 재고는 음수 불가 — 부품 사용 등록 시 재고 초과하면 `IllegalStateException`
2. `active = false` 부품은 목록 조회에서 제외, 사용 등록 불가
3. `PartUsage` 삭제는 등록자 본인 또는 ADMIN/MANAGER만 가능
4. 재고 직접 조정(`PATCH /stock`)은 ADMIN/MANAGER만 가능 — 입고 처리용
5. 완료된 유지보수 작업의 `PartUsage`는 삭제 불가

---

## 7. 제외 범위 (향후 고려)

- 부품 입출고 이력 별도 테이블 (현재는 재고 수치만 관리)
- 알림/푸시 기능 (재고 부족 시 — WBS 2차 범위)
- 대시보드 재고 부족 카드 (WBS 9단계에서 추가)
