# FactoryCare — 요구사항 정의서 & 진행 현황

> 체크박스로 진행상황 추적. 완료 시 `[ ]` → `[x]`

---

## 프로젝트 개요

제조 현장의 설비 정보, 정기점검, 고장 및 유지보수 작업 이력을 통합 관리하고, 축적된 데이터를 기반으로 설비 상태를 분석하는 웹 서비스.

**핵심 흐름:** 설비관리 → 점검관리 → 고장/장애관리 → 유지보수작업 → 부품/작업이력 → 통계/대시보드 → AI 설비 분석

---

## 사용자 역할 및 권한

| 역할 | 권한 |
|---|---|
| ADMIN | 모든 데이터 조회, 사용자/설비/작업/시스템 관리 |
| MANAGER | 설비관리, 점검관리, 작업배정, 통계조회 |
| WORKER | 담당 작업 조회, 점검 수행, 작업 결과 등록 |

---

## WBS & 진행 현황

### 환경 구성 (2.0~2.3) ✅
- [x] 2.0 Backend 초기 설정 (Spring Boot 4.1 + Gradle)
- [x] 2.1 Frontend 초기 설정 (React + TS + Vite + Tailwind)
- [x] 2.2 Git 저장소 설정 (.gitignore, 템플릿, GitHub 연결)
- [x] 2.3 MariaDB 연결 확인

---

### 인증/인가 (3.0~3.2) 🔄 진행중
- [ ] 3.0 User Entity + JJWT 의존성 + Repository
- [ ] 3.1 JWT Provider + Spring Security 설정
- [ ] 3.2 Auth API (login / logout / refresh) + User CRUD API

---

### 설비관리 (4.0~4.3)
- [ ] 4.0 Equipment Entity + Repository
- [ ] 4.1 설비 CRUD API (등록/수정/삭제/조회)
- [ ] 4.2 설비 상태 변경 API
- [ ] 4.3 설비 목록/상세 화면 (Frontend)

---

### 점검관리 (5.0~5.3)
- [ ] 5.0 Inspection Entity + Repository
- [ ] 5.1 점검 일정 API (생성/조회/수정)
- [ ] 5.2 체크리스트 + 점검 결과 API
- [ ] 5.3 점검 화면 (Frontend)

---

### 장애관리 (6.0~6.3)
- [ ] 6.0 Fault Entity + Repository
- [ ] 6.1 장애 등록 + 상태변경 API
- [ ] 6.2 장애 목록/상세 화면 (Frontend)
- [ ] 6.3 장애 → 유지보수 작업 연결

---

### 유지보수 (7.0~7.4)
- [ ] 7.0 MaintenanceTask Entity + Repository
- [ ] 7.1 작업 생성 + 배정 API
- [ ] 7.2 작업 처리 (시작/종료/결과 등록) API
- [ ] 7.3 작업 이력 조회 API
- [ ] 7.4 유지보수 화면 (Frontend)

---

### 부품관리 (8.0~8.3)
- [ ] 8.0 Parts Entity + Repository
- [ ] 8.1 부품 CRUD API + 재고 관리
- [ ] 8.2 유지보수 작업 - 부품 사용 연동
- [ ] 8.3 부품 화면 (Frontend)

---

### Dashboard (9.0~9.3)
- [ ] 9.0 KPI 집계 API (설비현황, 장애건수, 점검완료율)
- [ ] 9.1 Chart 데이터 API
- [ ] 9.2 필터(기간/설비/담당자) 적용
- [ ] 9.3 Dashboard 화면 (Frontend, Chart.js)

---

### AI 분석 (10.0~10.4)
- [ ] 10.0 분석 데이터 수집/가공 로직
- [ ] 10.1 Prompt 설계 (반복고장/점검권장)
- [ ] 10.2 Gemini/OpenAI API 연동
- [ ] 10.3 AI 분석 결과 저장
- [ ] 10.4 AI 분석 화면 (Frontend)

---

### 테스트 (11.0)
- [ ] 11.0 JUnit 단위 테스트 보완
- [ ] 11.1 통합 테스트

---

### 배포 (12.0~14.0)
- [ ] 12.0 Docker + Docker Compose 구성
- [ ] 13.0 AWS EC2 배포 + Nginx 설정
- [ ] 14.0 Jenkins CI/CD 파이프라인

---

### 문서화 (15.0)
- [ ] 15.0 README 작성 (설치/실행/API 문서)
- [ ] 15.1 포트폴리오 정리

---

## 기능 요구사항

### 1차 MVP (반드시 완성)
- [ ] 로그인 / 역할 기반 접근 제어
- [ ] 설비 등록 / 관리 (목록, 상세, 상태)
- [ ] 점검 일정 등록 / 결과 기록
- [ ] 고장 등록 / 상태 흐름 관리
- [ ] 유지보수 작업 생성 / 배정 / 처리 / 이력
- [ ] 대시보드 (KPI + Chart)

### 2차
- [ ] 검색 / 필터 / 페이징
- [ ] 파일 / 이미지 첨부
- [ ] 알림
- [ ] 부품 재고 관리
- [ ] 작업자 배정
- [ ] 통계

### 3차 (포트폴리오 차별화)
- [ ] AI 설비 이상 분석
- [ ] 반복 고장 분석
- [ ] 장애 원인 분석
- [ ] 설비별 위험도
- [ ] AI 유지보수 추천

---

## API 설계 체크리스트

### Auth
- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/logout`
- [ ] `POST /api/auth/refresh`

### Users
- [ ] `GET /api/users`
- [ ] `POST /api/users`
- [ ] `GET /api/users/{id}`
- [ ] `PATCH /api/users/{id}`
- [ ] `DELETE /api/users/{id}`

### Equipments
- [ ] `GET /api/equipments`
- [ ] `POST /api/equipments`
- [ ] `GET /api/equipments/{id}`
- [ ] `PATCH /api/equipments/{id}`
- [ ] `DELETE /api/equipments/{id}`

### Inspections
- [ ] `GET /api/inspections`
- [ ] `POST /api/inspections`
- [ ] `GET /api/inspections/{id}`
- [ ] `PATCH /api/inspections/{id}`

### Faults
- [ ] `GET /api/faults`
- [ ] `POST /api/faults`
- [ ] `GET /api/faults/{id}`
- [ ] `PATCH /api/faults/{id}/status`

### Maintenance
- [ ] `GET /api/maintenance`
- [ ] `POST /api/maintenance`
- [ ] `GET /api/maintenance/{id}`
- [ ] `PATCH /api/maintenance/{id}`
- [ ] `PATCH /api/maintenance/{id}/start`
- [ ] `PATCH /api/maintenance/{id}/complete`

### Dashboard
- [ ] `GET /api/dashboard/summary`
- [ ] `GET /api/dashboard/faults`
- [ ] `GET /api/dashboard/equipments`
- [ ] `GET /api/dashboard/maintenance`

### AI
- [ ] `POST /api/ai/equipments/{id}/analysis`

---

## DB 테이블 목록

- [ ] `users`
- [ ] `departments`
- [ ] `equipments`
- [ ] `equipment_types`
- [ ] `inspection_schedules`
- [ ] `inspection_checklists`
- [ ] `inspections`
- [ ] `inspection_results`
- [ ] `faults`
- [ ] `maintenance_tasks`
- [ ] `maintenance_histories`
- [ ] `parts`
- [ ] `part_usages`
- [ ] `notifications`
- [ ] `attachments`
