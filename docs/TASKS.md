# FactoryCare Task Tracker

브랜치별 작업 현황. 세션 시작 시 이 파일로 현황 파악.

---

## ✅ feat/equipment (WBS 4.0~4.3 설비관리)

> PR: feat/equipment → main | 상태: PR 생성 완료

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

## 🔜 feat/inspection (WBS 5.0~5.3 점검관리)

> 상태: 예정

- [ ] Task 1:
- [ ] Task 2:
- [ ] Task 3:

---

## ⬜ feat/failure (WBS 6.0~6.3 장애관리)

> 상태: 예정

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

> 업데이트 규칙: 브랜치 시작 시 태스크 채우기, 완료 시 ✅ + PR 번호 기록
