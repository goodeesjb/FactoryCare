[한국어](#한국어) | [English](#english)

---

<a name="한국어"></a>

# FactoryCare

> 제조 현장의 설비 정보, 정기점검, 고장 및 유지보수 작업 이력을 통합 관리하는 웹 서비스

![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?logo=mariadb&logoColor=white)

## 프로젝트 소개

FactoryCare는 산업용 설비의 유지보수 관리 전 과정을 디지털화하는 시스템입니다.  
설비 등록부터 정기점검, 고장 접수, 유지보수 작업 배정·처리, 부품 재고 관리까지 하나의 플랫폼에서 관리하며, 대시보드를 통해 설비 상태를 한눈에 파악할 수 있습니다.

산업용 로봇 엔지니어 현장 경험을 바탕으로, 실제 현장에서 발생하는 점검·장애 이력 분산 관리 문제를 해결하기 위해 설계되었습니다.

## 주요 기능

### 👤 역할 기반 접근 제어 (RBAC)

| 역할 | 권한 |
|---|---|
| **ADMIN** | 전체 데이터 조회, 사용자·설비·작업·시스템 관리 |
| **MANAGER** | 설비 등록·관리, 점검 일정 수립, 작업 배정, 통계 조회 |
| **WORKER** | 담당 작업 조회, 점검 수행, 작업 결과 등록 |

### 🏭 설비 관리

- 설비 등록·수정·비활성화 (설비번호, 유형, 제조사, 위치, 담당자 등)
- 설비 상태 관리: `정상` → `점검필요` → `고장` → `수리중` → `폐기`
- 상태 변경 이력 자동 기록
- 설비번호·유형·상태·위치·담당자 기준 동적 검색 (QueryDSL)

### 📋 점검 관리

- 점검 일정 등록 및 담당자 배정
- 체크리스트 기반 점검 수행 (모터, 센서, 오일, 볼트 등)
- 점검 결과 입력 시 이상 항목 자동 감지 → **장애 자동 생성**
- 점검 이력 조회

### ⚠️ 장애 관리

- 작업자 직접 장애 접수 또는 점검 결과에서 자동 생성
- 긴급도: `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`
- 상태 흐름: `접수` → `확인` → `작업중` → `해결` → `완료`
- 상태 전이 규칙 검증, 담당자 배정

### 🔧 유지보수 관리

- 작업 번호 자동 채번 (`MT-YYYY-NNN`)
- 작업 상태 흐름: `대기` → `진행중` → `완료` / `취소`
- 작업 이력(시작·메모·완료) 기록, 소요 시간 추적
- 담당자 배정 및 우선순위 설정

### 📦 부품 관리

- 부품 등록·수정·소프트 삭제 (부품번호 자동 채번 `PT-YYYY-NNN`)
- 유지보수 작업에서 부품 사용 시 **재고 자동 차감**
- 부품 사용 이력 삭제 시 **재고 자동 복원**
- 재고 부족(OUT) / 저재고(LOW) / 정상(NORMAL) 상태 표시
- 부품명·보관위치·재고상태 기준 검색

### 📊 대시보드

- 설비 상태 현황 KPI (정상·점검필요·고장·수리중 건수)
- 장애 긴급도별 통계 차트
- 유지보수 현황 (대기·진행중·완료)
- 기간·설비 상태 필터

## 기술 스택

| 구분 | 기술 |
|---|---|
| **Backend** | Java 21, Spring Boot 4.1, Spring Security, JWT |
| **ORM / 검색** | Spring Data JPA, Hibernate, QueryDSL |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **상태관리 / 통신** | TanStack Query, Axios, React Router |
| **차트** | Chart.js |
| **Database** | MariaDB |
| **테스트** | JUnit 5, Mockito, AssertJ |
| **인프라** | Docker, AWS EC2, Nginx, Jenkins |

## 시작하기

### 사전 요구사항

- JDK 21
- Node.js 18 이상
- MariaDB 10.6 이상

### 1. 저장소 클론

```bash
git clone https://github.com/goodeesjb/FactoryCare.git
cd FactoryCare
```

### 2. 데이터베이스 설정

MariaDB에 데이터베이스를 생성합니다.

```sql
CREATE DATABASE factorycare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Backend 실행

```bash
cd backend

# application.properties 설정 파일 생성
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

`application.properties`를 열어 아래 항목을 수정합니다.

```properties
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password
jwt.secret=your-jwt-secret-key-minimum-32-characters-long
```

```bash
# 실행 (Windows)
.\gradlew.bat bootRun

# 실행 (macOS / Linux)
./gradlew bootRun
```

서버가 `http://localhost:8080` 에서 실행됩니다.

### 4. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` 에서 접속할 수 있습니다.

## API 엔드포인트

| 도메인 | 주요 엔드포인트 |
|---|---|
| **인증** | `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh` |
| **사용자** | `GET /api/users`, `PATCH /api/users/{id}` |
| **설비** | `GET/POST /api/equipments`, `PATCH /api/equipments/{id}/status` |
| **점검** | `GET/POST /api/inspection-schedules`, `POST /api/inspections/{id}/complete` |
| **장애** | `GET/POST /api/faults`, `PATCH /api/faults/{id}/status`, `PATCH /api/faults/{id}/assign` |
| **유지보수** | `GET/POST /api/maintenance`, `POST /api/maintenance/{id}/start`, `POST /api/maintenance/{id}/complete` |
| **부품** | `GET/POST /api/parts`, `POST /api/maintenance/{id}/parts` |
| **대시보드** | `GET /api/dashboard` |

## 테스트

```bash
cd backend

# 전체 테스트 실행
.\gradlew.bat test        # Windows
./gradlew test            # macOS / Linux
```

총 **123개 테스트** (Service 단위 테스트 · Repository QueryDSL 테스트 · 통합 플로우 테스트) 가 포함되어 있습니다.

## 프로젝트 구조

```
FactoryCare/
├── backend/                        # Spring Boot 백엔드
│   └── src/main/java/com/factorycare/backend/
│       ├── auth/                   # 인증·인가 (JWT)
│       ├── domain/
│       │   ├── equipment/          # 설비 관리
│       │   ├── inspection/         # 점검 관리
│       │   ├── fault/              # 장애 관리
│       │   ├── maintenance/        # 유지보수 관리
│       │   ├── part/               # 부품 관리
│       │   ├── dashboard/          # 대시보드
│       │   └── user/               # 사용자 관리
│       ├── global/                 # 공통 설정·예외처리
│       └── security/               # Security·JWT 설정
├── frontend/                       # React 프론트엔드
│   └── src/
│       ├── pages/                  # 페이지 컴포넌트
│       ├── components/             # 공통 컴포넌트
│       ├── api/                    # API 클라이언트
│       └── hooks/                  # 커스텀 훅
└── docs/                           # 문서·설계
```

---

<a name="english"></a>

# FactoryCare

> A web service for integrated management of factory equipment information, regular inspections, failures, and maintenance work history

![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?logo=mariadb&logoColor=white)

## About

FactoryCare is a system that digitalizes the entire lifecycle of industrial equipment maintenance.  
From equipment registration, periodic inspections, fault reporting, and maintenance task assignment to parts inventory management — all managed on a single platform, with a dashboard for real-time equipment status monitoring.

Designed based on hands-on experience as an industrial robot engineer, this project addresses the real-world problem of scattered inspection and fault history records across different systems.

## Key Features

### 👤 Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| **ADMIN** | Full data access, user/equipment/task/system management |
| **MANAGER** | Equipment management, inspection scheduling, task assignment, statistics |
| **WORKER** | View assigned tasks, perform inspections, submit work results |

### 🏭 Equipment Management

- Register, update, and deactivate equipment (equipment number, type, manufacturer, location, assignee, etc.)
- Equipment status flow: `Normal` → `Needs Inspection` → `Broken` → `Under Repair` → `Decommissioned`
- Automatic status change history logging
- Dynamic search by equipment number, type, status, location, assignee (QueryDSL)

### 📋 Inspection Management

- Create inspection schedules and assign inspectors
- Checklist-based inspection execution (motor, sensor, oil, bolt, etc.)
- Abnormal results automatically trigger **fault creation**
- Inspection history tracking

### ⚠️ Fault Management

- Manual fault reporting by workers or automatic creation from inspection results
- Severity levels: `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`
- Status flow: `Reported` → `Confirmed` → `In Progress` → `Resolved` → `Closed`
- State transition validation, assignee management

### 🔧 Maintenance Management

- Auto-generated task numbers (`MT-YYYY-NNN`)
- Task status flow: `Pending` → `In Progress` → `Completed` / `Cancelled`
- Work history logging (start, notes, completion) with duration tracking
- Assignee assignment and priority management

### 📦 Parts Management

- Register, update, soft-delete parts (auto-generated part numbers `PT-YYYY-NNN`)
- **Automatic stock deduction** when parts are used in maintenance tasks
- **Automatic stock restoration** when part usage records are deleted
- Stock status: `OUT` / `LOW` / `NORMAL`
- Search by part name, storage location, and stock status

### 📊 Dashboard

- Equipment status KPI (Normal / Needs Inspection / Broken / Under Repair counts)
- Fault severity statistics charts
- Maintenance status overview (Pending / In Progress / Completed)
- Period and equipment status filters

## Tech Stack

| Category | Technology |
|---|---|
| **Backend** | Java 21, Spring Boot 4.1, Spring Security, JWT |
| **ORM / Search** | Spring Data JPA, Hibernate, QueryDSL |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **State / Communication** | TanStack Query, Axios, React Router |
| **Charts** | Chart.js |
| **Database** | MariaDB |
| **Testing** | JUnit 5, Mockito, AssertJ |
| **Infrastructure** | Docker, AWS EC2, Nginx, Jenkins |

## Getting Started

### Prerequisites

- JDK 21
- Node.js 18+
- MariaDB 10.6+

### 1. Clone the Repository

```bash
git clone https://github.com/goodeesjb/FactoryCare.git
cd FactoryCare
```

### 2. Database Setup

Create a MariaDB database.

```sql
CREATE DATABASE factorycare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Run the Backend

```bash
cd backend

# Create application.properties from example
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

Edit `application.properties` with your configuration:

```properties
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password
jwt.secret=your-jwt-secret-key-minimum-32-characters-long
```

```bash
# Run (Windows)
.\gradlew.bat bootRun

# Run (macOS / Linux)
./gradlew bootRun
```

The server starts at `http://localhost:8080`.

### 4. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Access the app at `http://localhost:5173`.

## API Endpoints

| Domain | Key Endpoints |
|---|---|
| **Auth** | `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh` |
| **Users** | `GET /api/users`, `PATCH /api/users/{id}` |
| **Equipment** | `GET/POST /api/equipments`, `PATCH /api/equipments/{id}/status` |
| **Inspection** | `GET/POST /api/inspection-schedules`, `POST /api/inspections/{id}/complete` |
| **Fault** | `GET/POST /api/faults`, `PATCH /api/faults/{id}/status`, `PATCH /api/faults/{id}/assign` |
| **Maintenance** | `GET/POST /api/maintenance`, `POST /api/maintenance/{id}/start`, `POST /api/maintenance/{id}/complete` |
| **Parts** | `GET/POST /api/parts`, `POST /api/maintenance/{id}/parts` |
| **Dashboard** | `GET /api/dashboard` |

## Testing

```bash
cd backend

# Run all tests
.\gradlew.bat test        # Windows
./gradlew test            # macOS / Linux
```

The project includes **123 tests** covering service-layer unit tests, repository QueryDSL tests, and end-to-end integration flow tests.

## Project Structure

```
FactoryCare/
├── backend/                        # Spring Boot backend
│   └── src/main/java/com/factorycare/backend/
│       ├── auth/                   # Authentication & Authorization (JWT)
│       ├── domain/
│       │   ├── equipment/          # Equipment management
│       │   ├── inspection/         # Inspection management
│       │   ├── fault/              # Fault management
│       │   ├── maintenance/        # Maintenance management
│       │   ├── part/               # Parts management
│       │   ├── dashboard/          # Dashboard
│       │   └── user/               # User management
│       ├── global/                 # Global config & exception handling
│       └── security/               # Security & JWT configuration
├── frontend/                       # React frontend
│   └── src/
│       ├── pages/                  # Page components
│       ├── components/             # Shared components
│       ├── api/                    # API clients
│       └── hooks/                  # Custom hooks
└── docs/                           # Documentation & design specs
```
