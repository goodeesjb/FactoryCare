# FactoryCare Task Tracker

브랜치별 작업 현황. 세션 시작 시 이 파일로 현황 파악.

---

## ✅ WBS 2.0~2.3 환경구성 (main)

> 커밋: `30c0d13` | 상태: 완료 (main 직접 커밋)

- [x] Spring Boot 프로젝트 초기 설정
- [x] React + Vite + TypeScript 프로젝트 초기 설정
- [x] MariaDB 연결 설정
- [x] Git 레포지토리 초기화

---

## ✅ WBS 3.0~3.2 인증/인가 (main)

> 커밋: `30c0d13` ~ `11abd2d` | 상태: 완료 (main 직접 커밋)

- [x] User 엔티티 + UserRepository + JJWT 의존성
- [x] JwtProvider + JwtProperties
- [x] Spring Security + JWT 필터 설정
- [x] 로그인/로그아웃/리프레시 토큰 API
- [x] User CRUD API + 역할 기반 접근제어 (@PreAuthorize)
- [x] 리팩토링: 로그인 시 DB 중복 조회 제거
- [x] fix: refresh-token-as-bearer NPE 방지, logout 401 수정
- [x] fix: @PreAuthorize Long 비교 `==` → `equals()`
- [x] Frontend 랜딩 페이지 + 기본 라우팅

---

## ✅ feat/equipment (WBS 4.0~4.3 설비관리)

> 커밋: `9eab96d` ~ `b237355` | 상태: PR 생성 완료

- [x] Task 1: QueryDSL 5.1.0:jakarta 의존성 추가 + JPAQueryFactory Bean 등록
- [x] Task 2: EquipmentType 엔티티/레포지토리/서비스/컨트롤러
- [x] Task 3: Equipment 엔티티 + QueryDSL 동적 검색 레포지토리
- [x] Task 4: Equipment CRUD 서비스 + 컨트롤러
- [x] Task 5: 상태변경 API + EquipmentStatusHistory 자동 기록
- [x] Task 6: Frontend 타입 정의 + API 클라이언트
- [x] Task 7: 설비 목록 페이지 (검색 폼 + 테이블 + 페이지네이션)
- [x] Task 8: 설비 등록/수정 폼
- [x] Task 9: 설비 상세 + 상태변경 모달 + 이력 목록

**Post-merge 후속 작업**
- [ ] assigneeId UI — 사용자 목록 API 구현 후 드롭다운 추가
- [ ] 설비 목록 N+1 쿼리 — type/assignee fetch join
- [ ] 클라이언트 역할 게이팅 — WORKER 쓰기 버튼 숨김

---

## ✅ feat/inspection (WBS 5.0~5.3 점검관리)

> 커밋: `7a722bd` ~ `a62fa8f` | 상태: 완료 (main 머지됨)

- [x] Task 1: 체크리스트 엔티티 + 리포지토리
- [x] Task 2: 체크리스트 DTO + Service + Controller + 테스트
- [x] Task 3: 점검 일정 엔티티 + QueryDSL 리포지토리
- [x] Task 4: 점검 일정 DTO + Service + Controller + 테스트
- [x] Task 5: 점검 수행 엔티티 + Service + Controller + 테스트
- [x] Task 6: Frontend 타입 + API 클라이언트
- [x] Task 7: 체크리스트 관리 페이지
- [x] Task 8: 점검 일정 목록 + 등록 페이지
- [x] Task 9: 점검 수행 페이지 + 라우터 완성

---

## ✅ feat/fault (WBS 6.0~6.3 장애관리 백엔드)

> 커밋: `51c4e15` ~ `1ad578f` | PR #5 머지 완료

- [x] Task 1: Fault 엔티티 + QueryDSL 리포지토리
- [x] Task 2: Fault DTO + Service + Controller + 테스트
- [x] Task 3: 점검결과 연동 (InspectionService.complete() 수정)

---

## ✅ feat/fault-frontend (WBS 6.0~6.3 장애관리 프론트엔드)

> 커밋: `a18668a` ~ `a4f2be9` | PR #6 생성 완료

- [x] Task 4: Frontend 타입 + API 클라이언트
- [x] Task 5: FaultListPage + FaultCreatePage
- [x] Task 6: FaultDetailPage + FaultStatusModal + 라우터 등록

---

## ⬜ feat/maintenance (WBS 7.0~7.4 유지보수)

> 상태: 예정

---

## ⬜ feat/parts (WBS 8.0~8.3 부품관리)

> 상태: 예정

---

## ⬜ feat/dashboard (WBS 9.0~9.3 Dashboard)

> 상태: 예정

---

## ⬜ feat/ai (WBS 10.0~10.4 AI 분석)

> 상태: 예정

---

## ⬜ feat/deploy (WBS 12.0~14.0 Docker/AWS/CI-CD)

> 상태: 예정

---

> 업데이트 규칙: 브랜치 시작 시 태스크 채우기, 완료 시 ✅ + 커밋 범위 기록
