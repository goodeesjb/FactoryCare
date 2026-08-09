# 설비관리 설계 (WBS 4.0~4.3)

## 개요

설비 정보 등록/조회/수정/삭제, 상태관리, 상태변경 이력 추적, 동적 검색(QueryDSL)을 포함하는 설비관리 기능.
Backend 완성 후 Frontend 구현 순서로 진행 (순차 방식).

---

## 데이터 모델

### equipment_types
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | |
| name | VARCHAR(50) NOT NULL UNIQUE | 설비유형명 |
| description | VARCHAR(255) | 설명 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### equipments
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | |
| equipment_no | VARCHAR(50) NOT NULL UNIQUE | 설비번호 |
| name | VARCHAR(100) NOT NULL | 설비명 |
| type_id | BIGINT FK → equipment_types | 설비유형 |
| manufacturer | VARCHAR(100) | 제조사 |
| model_name | VARCHAR(100) | 모델명 |
| installed_at | DATE | 설치일 |
| location | VARCHAR(100) | 위치 |
| department | VARCHAR(100) | 관리부서 (String, departments 테이블 연동은 추후) |
| assignee_id | BIGINT FK → users | 담당자 |
| status | ENUM | NORMAL / INSPECTION_NEEDED / BROKEN / REPAIRING / DISCARDED |
| description | TEXT | 설명 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### equipment_status_histories
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | BIGINT PK | |
| equipment_id | BIGINT FK → equipments | |
| changed_by | BIGINT FK → users | 변경자 |
| previous_status | ENUM | 이전 상태 |
| new_status | ENUM | 변경 후 상태 |
| reason | VARCHAR(500) | 변경 사유 |
| changed_at | DATETIME | 변경 시각 |

### JPA 연관관계
- `Equipment` `@ManyToOne` → `EquipmentType`
- `Equipment` `@ManyToOne` → `User` (assignee)
- `EquipmentStatusHistory` `@ManyToOne` → `Equipment`
- `EquipmentStatusHistory` `@ManyToOne` → `User` (changed_by)

---

## API 설계

### EquipmentType

| Method | URL | 권한 | 설명 |
|---|---|---|---|
| GET | /api/equipment-types | ADMIN, MANAGER, WORKER | 전체 조회 |
| POST | /api/equipment-types | ADMIN | 생성 |
| PATCH | /api/equipment-types/{id} | ADMIN | 수정 |
| DELETE | /api/equipment-types/{id} | ADMIN | 삭제 |

### Equipment

| Method | URL | 권한 | 설명 |
|---|---|---|---|
| GET | /api/equipments | 전체 | 목록 + 필터 + 페이징 |
| POST | /api/equipments | ADMIN, MANAGER | 등록 |
| GET | /api/equipments/{id} | 전체 | 상세 |
| PATCH | /api/equipments/{id} | ADMIN, MANAGER | 수정 |
| DELETE | /api/equipments/{id} | ADMIN | 삭제 |
| PATCH | /api/equipments/{id}/status | ADMIN, MANAGER | 상태변경 |
| GET | /api/equipments/{id}/status-histories | 전체 | 상태변경 이력 |

### 목록 조회 쿼리 파라미터
```
GET /api/equipments?equipmentNo=&name=&typeId=&status=&location=&assigneeId=&page=0&size=10
```

---

## QueryDSL 검색

`EquipmentSearchCondition` record로 조건 캡슐화:

```java
record EquipmentSearchCondition(
    String equipmentNo,
    String name,
    Long typeId,
    EquipmentStatus status,
    String location,
    Long assigneeId
)
```

- `String` 조건 → `containsIgnoreCase()` (부분검색)
- `Enum` / `Long` 조건 → `eq()`
- null 조건 → 자동 무시 (`BooleanExpression` 반환 null 처리)
- `Pageable` + `Page<T>` 반환 → 페이징 지원

구조: `EquipmentRepositoryCustom` 인터페이스 + `EquipmentRepositoryImpl` 구현체

---

## 상태변경 이력

상태 변경(`PATCH /api/equipments/{id}/status`) 호출 시:
1. 현재 상태 → `previous_status`로 기록
2. 새 상태 저장
3. `equipment_status_histories`에 변경자 + 사유 + 시각 자동 기록

---

## Backend 패키지 구조

기존 `domain/user` 패턴 동일 적용:

```
domain/
  equipment/
    controller/  EquipmentController, EquipmentTypeController
    service/     EquipmentService, EquipmentTypeService
    repository/  EquipmentRepository, EquipmentRepositoryCustom, EquipmentRepositoryImpl
                 EquipmentTypeRepository, EquipmentStatusHistoryRepository
    entity/      Equipment, EquipmentType, EquipmentStatusHistory, EquipmentStatus
    dto/         (request/response records)
```

---

## Frontend 구조

| 경로 | 설명 |
|---|---|
| /equipments | 설비 목록 (필터 폼 + 테이블 + 페이지네이션) |
| /equipments/new | 설비 등록 |
| /equipments/:id | 설비 상세 + 상태변경 이력 |
| /equipments/:id/edit | 설비 수정 |

- TanStack Query로 API 호출 + 캐시 관리
- 상태변경: 모달 (상태 선택 + 사유 입력)
- 역할별 버튼 노출 제어 (WORKER → 등록/수정/삭제 버튼 숨김)
- Tailwind CSS로 스타일링

---

## 구현 순서

1. Backend — EquipmentType (Entity → Repository → Service → Controller)
2. Backend — Equipment CRUD (Entity → Repository+QueryDSL → Service → Controller)
3. Backend — 상태변경 + 이력 API
4. Frontend — 라우팅 추가 + 설비 목록 페이지
5. Frontend — 설비 등록/수정 폼
6. Frontend — 설비 상세 + 상태변경 모달 + 이력
